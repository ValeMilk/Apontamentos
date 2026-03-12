import { useState, useCallback, useMemo, useEffect } from 'react';
import { AttendanceRecord, AttendanceCode, DayInfo, Justification } from '@/types/attendance';
import { employees, supervisors as mockSupervisors, holidays } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { format, isSunday, addDays } from 'date-fns';

export function useAttendance() {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    try {
      const raw = localStorage.getItem('attendance_currentDate');
      return raw ? new Date(raw) : new Date(2026, 0, 1);
    } catch (e) {
      return new Date(2026, 0, 1);
    }
  }); // Janeiro 2026
  const [selectedSupervisor, setSelectedSupervisor] = useState<string | 'all'>('all');
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'supervisor' | 'expectador'>('admin');
  const [supervisorsState, setSupervisorsState] = useState(() => [] as any[]);
  const [employeesState, setEmployeesState] = useState(() => [] as any[]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dirtyRecordKeys, setDirtyRecordKeys] = useState<Set<string>>(new Set());

  // helper to slugify names for stable ids
  const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  const dedupeById = (list: any[]) => {
    const map = new Map<string, any>();
    (list || []).forEach((item: any) => {
      if (!item) return;
      const key = String(item.id || '').trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  };
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);

  const makeRecordKey = (employeeId: string, day: string) => `${employeeId}__${day}`;

  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of records) {
      map.set(makeRecordKey(record.employeeId, record.day), record);
    }
    return map;
  }, [records]);

  const employeesById = useMemo(() => {
    const map = new Map<string, any>();
    for (const employee of employeesState as any[]) {
      map.set(String(employee?.id || ''), employee);
    }
    return map;
  }, [employeesState]);

  // auth context (for saving/fetching persisted data)
  const { accessToken, user } = useAuth();

  const refreshData = useCallback(() => {
    setRefreshTick((value) => value + 1);
  }, []);

  // Gera o período do dia 26 do mês corrente até 25 do mês seguinte.
  const daysInMonth = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 26);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 25);
    const days: DayInfo[] = [];

    for (let d = start; d <= end; d = addDays(d, 1)) {
      const date = new Date(d);
      const dateStr = format(date, 'yyyy-MM-dd');
      days.push({
        day: dateStr,
        date,
        isSunday: isSunday(date),
        isHoliday: !!holidays[dateStr],
        holidayName: holidays[dateStr],
      });
    }

    return days;
  }, [currentDate]);

  const periodStart = daysInMonth[0]?.day;
  const periodEnd = daysInMonth[daysInMonth.length - 1]?.day;

  const employeesQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedSupervisor !== 'all') {
      params.set('supervisorUserId', String(selectedSupervisor));
    }
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [selectedSupervisor]);

  const isSupervisorRole = (role: string) => {
    const normalized = String(role || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return normalized === 'supervisor';
  };

  const filteredEmployees = useMemo(() => {
    const workers = dedupeById(employeesState).filter(
      (e: any) => !isSupervisorRole(e.role)
    );

    if (selectedSupervisor === 'all') return workers;

    return workers.filter(
      (e: any) => String(e?.supervisorUserId || '') === String(selectedSupervisor)
    );
  }, [employeesState, selectedSupervisor]);

  const currentSupervisor = useMemo(() => {
    if (selectedSupervisor === 'all') return null;
    return supervisorsState.find(s => s.id === selectedSupervisor) || null;
  }, [selectedSupervisor, supervisorsState]);

  // fetch supervisors from backend (fallback to mock data)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!accessToken) {
        if (!mounted) return;
        setSupervisorsState(mockSupervisors);
        setEmployeesState(employees);
        return;
      }
      try {
        const res = await fetch('/api/supervisors', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        if (!res.ok) throw new Error('Failed to fetch supervisors');
        const data = await res.json();
        if (!mounted) return;
        // map backend users -> Supervisor[] shape expected by UI
        const mapped = data.map((u: any) => ({
          // Always use unique user id for filter select value
          id: (u._id || u.id || u.supervisorId).toString(),
          name: u.name,
          store: `REGIÃO - ${u.name}`,
        }));
        const deduped = dedupeById(mapped);
        setSupervisorsState(deduped);

        // Try to load canonical employees list from backend (preferred)
        let employeesLoadedFromApi = false;
        try {
          const empRes = await fetch(`/api/employees${employeesQueryString}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          });
          if (empRes.ok) {
            const data = await empRes.json();
            // Phase 3: Support both old array format and new paginated { employees, total, page, limit } format
            const emps = Array.isArray(data) ? data : (data?.employees || []);
            if (mounted && Array.isArray(emps)) {
              const mapped = emps
                .filter((e: any) => !isSupervisorRole(e.role || ''))
                .map((e: any) => ({
                  id: e.id || `${e.supervisorId}-${e.slug}`,
                  name: e.name || e.displayName || e.slug,
                  role: e.role || 'FUNCIONÁRIO',
                  supervisorId: e.supervisorId,
                  supervisorUserId: e.supervisorUserId || (selectedSupervisor !== 'all' ? String(selectedSupervisor) : ''),
                }));
              setEmployeesState(dedupeById(mapped));
              employeesLoadedFromApi = true;
            }
          }
        } catch (e) {
          // ignore and fall back to deriving employees below
        }

        // derive employees list from supervisors payload when available
        const derivedEmployees: any[] = [];
        data.forEach((u: any) => {
          const supId = (u.supervisorId || u._id || u.id).toString();
          const supUserId = (u._id || u.id || '').toString();
          const emps = Array.isArray(u.employees) ? u.employees : [];
          emps.forEach((e: any, idx: number) => {
            if (isSupervisorRole(e.role || '')) return;
            const name = e.name || e.employeeName || (`employee-${idx}`);
            const id = `${supId}-${slug(name)}`;
            derivedEmployees.push({ id, name, role: e.role || 'FUNCIONÁRIO', supervisorId: supId, supervisorUserId: supUserId });
          });
        });
        if (!employeesLoadedFromApi && derivedEmployees.length > 0) {
          setEmployeesState(dedupeById(derivedEmployees));
        }
      } catch (e) {
        // keep mock supervisors if fetch fails
        console.warn('Could not load supervisors from API, using mock data', e);
      }
    })();
    return () => { mounted = false; };
  }, [accessToken, employeesQueryString, refreshTick]);

  // Load persisted attendance + justifications when authenticated
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!accessToken) return;
      if (hasUnsavedChanges) return;
      try {
        const attRes = await fetch('/api/attendance', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (attRes.ok) {
          const att = await attRes.json();
          if (!mounted) return;
          setRecords(att.map((r: any) => ({ employeeId: r.employeeId, day: r.day, apontador: r.apontador, supervisor: r.supervisor })));
          setDirtyRecordKeys(new Set());
          setHasUnsavedChanges(false);
        }

        const justRes = await fetch('/api/attendance/justifications', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (justRes.ok) {
          const js = await justRes.json();
          if (!mounted) return;
          setJustifications(js.map((j: any) => ({ id: j._id || `just-${Date.now()}`, employeeId: j.employeeId, day: j.day, text: j.text })));
        }
      } catch (e) {
        // ignore errors (backend may not be available)
      }
    })();
    return () => { mounted = false; };
  }, [accessToken, refreshTick, hasUnsavedChanges]);

  // Auto-refresh for non-admin users so status updates from admin appear without full page reload.
  useEffect(() => {
    if (!accessToken) return;
    if (currentUserRole === 'admin') return;
    if (hasUnsavedChanges) return;
    const timer = setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [accessToken, currentUserRole, hasUnsavedChanges]);

  const getRecord = useCallback((employeeId: string, day: string): AttendanceRecord => {
    const existing = recordsMap.get(makeRecordKey(employeeId, day));
    if (existing) return existing;
    return { employeeId, day, apontador: '', supervisor: '' };
  }, [recordsMap]);

  const updateRecord = useCallback((
    employeeId: string,
    day: string,
    field: 'apontador' | 'supervisor',
    value: AttendanceCode
  ) => {
    const key = makeRecordKey(employeeId, day);
    setDirtyRecordKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setHasUnsavedChanges(true);
    setRecords(prev => {
      const JUST_CODES_TO_PREFILL: AttendanceCode[] = ['AT', 'ABF', 'ABT'];
      const index = prev.findIndex(r => r.employeeId === employeeId && r.day === day);
      if (index >= 0) {
        const updated = [...prev];
        const existing = updated[index];
        // se o apontador mudou, sincroniza no supervisor salvo, exceto quando o supervisor
        // já tem uma justificativa de abono (AT/ABF/ABT) — nesses casos não sobrescreve.
        if (field === 'apontador') {
          const supervisorVal = JUST_CODES_TO_PREFILL.includes(existing.supervisor as AttendanceCode)
            ? existing.supervisor
            : value;
          updated[index] = { ...existing, apontador: value, supervisor: supervisorVal };
        } else {
          updated[index] = { ...existing, [field]: value };
        }
        return updated;
      }

      // não existe ainda — criamos record e, por padrão, sincronizamos supervisor com apontador
      if (field === 'apontador') {
        return [...prev, { employeeId, day, apontador: value, supervisor: value }];
      }
      return [...prev, { employeeId, day, apontador: '', supervisor: '', [field]: value }];
    });

    // Se o campo alterado for do supervisor e for uma justificativa de abono,
    // criar/atualizar uma justificativa pré-preenchida com "Nome — DD/MM/YYYY".
    const JUST_CODES_TO_PREFILL: AttendanceCode[] = ['AT', 'ABF', 'ABT'];
    if (field === 'supervisor' && JUST_CODES_TO_PREFILL.includes(value as AttendanceCode)) {
      const emp = employeesState.find((e) => e.id === employeeId);
      const dayInfo = daysInMonth.find((d) => d.day === day);
      const empName = emp?.name ?? employeeId;
      const dateBr = dayInfo ? format(dayInfo.date, 'dd/MM/yyyy') : day;
      const placeholder = `${empName} — ${dateBr}`;

      setJustifications((prev) => {
        const exists = prev.some((j) => j.employeeId === employeeId && j.day === day);
        if (exists) return prev;
        return [{ id: `just-${Date.now()}`, employeeId, day, text: placeholder }, ...prev];
      });
    }
  }, [employeesState, daysInMonth]);

  const clearAll = useCallback(() => {
    setHasUnsavedChanges(true);
    setDirtyRecordKeys(new Set());
    setRecords([]);
    setJustifications([]);
  }, []);

  const addJustification = useCallback((
    employeeId: string,
    day: string,
    text: string,
    applyToSupervisor?: boolean,
    supervisorCode?: AttendanceCode
  ) => {
    setHasUnsavedChanges(true);
    const newJustification = { id: `just-${Date.now()}`, employeeId, day, text };

    setJustifications(prev => [
      newJustification,
      ...prev,
    ]);

    // Se solicitado, aplicar também à legenda do supervisor (AT/ABF/ABT)
    const JUST_CODES_TO_PREFILL: AttendanceCode[] = ['AT', 'ABF', 'ABT'];
    if (applyToSupervisor && supervisorCode && JUST_CODES_TO_PREFILL.includes(supervisorCode)) {
      // atualiza o registro do supervisor para este dia
      updateRecord(employeeId, day, 'supervisor', supervisorCode);
    }

    // Autosave para alterações vindas da seção de justificativas.
    // Se falhar, o usuário ainda pode usar o botão "Salvar" da tabela normalmente.
    if (!accessToken) return;

    void (async () => {
      try {
        const existing = recordsMap.get(makeRecordKey(employeeId, day));
        const employee = employeesById.get(employeeId) as any;

        if (applyToSupervisor && supervisorCode && JUST_CODES_TO_PREFILL.includes(supervisorCode)) {
          const attendancePayload = {
            records: [
              {
                employeeId,
                day,
                apontador: existing?.apontador || '',
                supervisor: supervisorCode,
                employeeName: employee?.name || '',
                supervisorId: employee?.supervisorId || '',
              },
            ],
          };

          const attendanceRes = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(attendancePayload),
          });

          if (!attendanceRes.ok) {
            const bodyText = await attendanceRes.text().catch(() => '');
            throw new Error(`Autosave attendance failed: ${attendanceRes.status} ${bodyText}`);
          }

          const key = makeRecordKey(employeeId, day);
          setDirtyRecordKeys(prev => {
            if (!prev.has(key)) return prev;
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }

        const justRes = await fetch('/api/attendance/justifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ justifications: [{ employeeId, day, text }] }),
        });

        if (!justRes.ok) {
          const bodyText = await justRes.text().catch(() => '');
          throw new Error(`Autosave justification failed: ${justRes.status} ${bodyText}`);
        }
      } catch (error) {
        console.error('Autosave from justifications failed. You can still use Save button.', error);
      }
    })();
  }, [updateRecord, accessToken, recordsMap, employeesById]);

  const removeJustification = useCallback((id: string) => {
    const current = justifications.find(j => j.id === id);
    if (!current) return;

    setHasUnsavedChanges(true);
    setJustifications(prev => prev.filter(j => j.id !== id));

    if (!accessToken) return;

    void (async () => {
      try {
        const res = await fetch('/api/attendance/justifications', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ id: current.id, employeeId: current.employeeId, day: current.day }),
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '');
          throw new Error(`Delete justification failed: ${res.status} ${bodyText}`);
        }
      } catch (error) {
        console.error('Failed to delete justification in backend', error);
        setJustifications(prev => {
          const exists = prev.some(j => j.id === current.id);
          if (exists) return prev;
          return [current, ...prev];
        });
      }
    })();
  }, [justifications, accessToken]);

  const getTotals = useCallback((day: string) => {
    let totalFaltas = 0;
    filteredEmployees.forEach(emp => {
      const record = getRecord(emp.id, day);
      const code = record.supervisor || record.apontador;
      if (code === 'F' || code === 'FT' || code === 'FM') {
        totalFaltas++;
      }
    });
    return totalFaltas;
  }, [filteredEmployees, getRecord]);

  const generateExportData = useCallback(() => {
    const data: any[] = [];
    
    filteredEmployees.forEach(emp => {
      const row: any = {
        funcionario: emp.name,
        funcao: emp.role,
      };
      
      daysInMonth.forEach(dayInfo => {
        const record = getRecord(emp.id, dayInfo.day);
        let finalValue = '';
        
        if (dayInfo.isSunday) {
          finalValue = 'DOM';
        } else {
          finalValue = record.supervisor || record.apontador || 'FOLGA';
        }
        
        row[`dia_${dayInfo.day}`] = finalValue;
      });
      
      data.push(row);
    });
    
    return data;
  }, [filteredEmployees, daysInMonth, getRecord]);

  // Save records + justifications to backend
  const saveAll = useCallback(async () => {
    try {
      const recordsToSave = dirtyRecordKeys.size > 0
        ? records.filter((r) => dirtyRecordKeys.has(makeRecordKey(r.employeeId, r.day)))
        : [];

      // DEBUG: log payload to help diagnose save failures in browser
      try { console.debug('[saveAll] sending records(delta)', recordsToSave); } catch (e) {}

      if (recordsToSave.length > 0) {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: accessToken ? `Bearer ${accessToken}` : '' },
          body: JSON.stringify({
            records: recordsToSave.map(r => {
              const employee = employeesById.get(r.employeeId) as any;
              return {
                ...r,
                employeeName: employee?.name || '',
                supervisorId: employee?.supervisorId || '',
              };
            }),
          }),
        });
        if (!res.ok) {
          // attempt to read body for debugging
          let bodyText = '';
          try { bodyText = await res.text(); } catch (e) { bodyText = '<no body>'; }
          console.error('[saveAll] POST /api/attendance failed', res.status, bodyText);
          throw new Error('Failed to save attendance');
        }
      }

      if (justifications.length > 0) {
        const jres = await fetch('/api/attendance/justifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: accessToken ? `Bearer ${accessToken}` : '' },
          body: JSON.stringify({ justifications }),
        });
        if (!jres.ok) throw new Error('Failed to save justifications');
      }

      // Refresh local state from backend so UI reflects canonical saved data
      try {
        const attRes = await fetch('/api/attendance', {
          headers: { Authorization: accessToken ? `Bearer ${accessToken}` : '' },
        });
        if (attRes.ok) {
          const att = await attRes.json();
          setRecords(att.map((r: any) => ({ employeeId: r.employeeId, day: r.day, apontador: r.apontador, supervisor: r.supervisor })));
        }

        const justRes = await fetch('/api/attendance/justifications', {
          headers: { Authorization: accessToken ? `Bearer ${accessToken}` : '' },
        });
        if (justRes.ok) {
          const js = await justRes.json();
          setJustifications(js.map((j: any) => ({ id: j._id || `just-${Date.now()}`, employeeId: j.employeeId, day: j.day, text: j.text })));
        }
        // Re-fetch canonical employees so UI uses current server-side list
        try {
          const empRes = await fetch(`/api/employees${employeesQueryString}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          });
          if (empRes.ok) {
            const data = await empRes.json();
            // Phase 3: Support both old array format and new paginated { employees, total, page, limit } format
            const emps = Array.isArray(data) ? data : (data?.employees || []);
            const mapped = (Array.isArray(emps) ? emps : []).map((e: any) => ({
              id: e.id || `${e.supervisorId}-${e.slug}`,
              name: e.name || e.displayName || e.slug,
              role: e.role || 'FUNCIONÁRIO',
              supervisorId: e.supervisorId,
              supervisorUserId: e.supervisorUserId || (selectedSupervisor !== 'all' ? String(selectedSupervisor) : ''),
            }));
            setEmployeesState(dedupeById(mapped));
          }
        } catch (e) {
          // ignore employee refresh errors
        }
      } catch (e) {
        // ignore refresh errors but keep save success
        console.warn('Saved but failed to refresh local state', e);
      }

      setHasUnsavedChanges(false);
      setDirtyRecordKeys(new Set());

      return true;
    } catch (e) {
      console.error('Failed to save attendance', e);
      return false;
    }
  }, [records, justifications, accessToken, employeesQueryString, dirtyRecordKeys, employeesById]);

  return {
    currentDate,
    setCurrentDate,
    selectedSupervisor,
    setSelectedSupervisor,
    currentUserRole,
    setCurrentUserRole,
    records,
    justifications,
    daysInMonth,
    filteredEmployees,
    currentSupervisor,
    supervisors: supervisorsState,
    getRecord,
    updateRecord,
    clearAll,
    addJustification,
    removeJustification,
    getTotals,
    generateExportData,
    saveAll,
    refreshData,
  };
}

// Persist currentDate when it changes
// Use an exported effect hook to avoid unexpected side effects at module import time.
export function usePersistCurrentDate(currentDate: Date) {
  useEffect(() => {
    try {
      localStorage.setItem('attendance_currentDate', currentDate.toISOString());
    } catch (e) {
      // ignore
    }
  }, [currentDate]);
}
