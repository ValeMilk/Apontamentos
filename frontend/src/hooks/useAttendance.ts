import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AttendanceRecord, AttendanceCode, DayInfo, Justification } from '@/types/attendance';
import { employees, supervisors as mockSupervisors, holidays } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { format, isSunday, addDays } from 'date-fns';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'gerente' | 'supervisor' | 'expectador'>('admin');
  const [supervisorsState, setSupervisorsState] = useState(() => [] as any[]);
  const [employeesState, setEmployeesState] = useState(() => [] as any[]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dirtyRecordKeys, setDirtyRecordKeys] = useState<Set<string>>(new Set());
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');

  // Refs para autosave (não causam rerender)
  const autosaveTimerRef = useRef<number | null>(null);
  const savedFlashTimeoutRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const pendingAfterSaveRef = useRef(false);
  const saveAllRef = useRef<() => Promise<boolean>>(async () => false);
  const autosavePausedRef = useRef(false);

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
    const workers = dedupeById(employeesState);

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
          supervisorId: (u.supervisorId || '').toString(),
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
                .map((e: any) => ({
                  id: e.id || `${e.supervisorId}-${e.slug}`,
                  name: e.name || e.displayName || e.slug,
                  role: e.role || 'FUNCIONÁRIO',
                  supervisorId: e.supervisorId,
                  supervisorUserId: e.supervisorUserId || '',
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
  // Send period bounds to avoid full collection scans
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!accessToken) return;
      if (hasUnsavedChanges) return;
      try {
        const periodParams = periodStart && periodEnd ? `?startDay=${periodStart}&endDay=${periodEnd}` : '';
        const [attRes, justRes] = await Promise.all([
          fetch(`/api/attendance${periodParams}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch('/api/attendance/justifications', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);
        if (attRes.ok) {
          const att = await attRes.json();
          if (!mounted) return;
          setRecords(att.map((r: any) => ({ employeeId: r.employeeId, day: r.day, apontador: r.apontador, supervisor: r.supervisor })));
          setDirtyRecordKeys(new Set());
          setHasUnsavedChanges(false);
        }

        if (justRes.ok) {
          const js = await justRes.json();
          if (!mounted) return;
          setJustifications(js.map((j: any) => ({ id: j._id || `just-${Date.now()}`, employeeId: j.employeeId, day: j.day, text: j.text, attestFile: j.attestFile || undefined })));
        }
      } catch (e) {
        // ignore errors (backend may not be available)
      }
    })();
    return () => { mounted = false; };
  }, [accessToken, refreshTick, hasUnsavedChanges, periodStart, periodEnd]);

  // Auto-refresh for non-admin users so status updates from admin appear without full page reload.
  useEffect(() => {
    if (!accessToken) return;
    if (currentUserRole === 'admin') return;
    if (hasUnsavedChanges) return;
    const timer = setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [accessToken, currentUserRole, hasUnsavedChanges]);

  const getRecord = useCallback((employeeId: string, day: string): AttendanceRecord => {
    const existing = recordsMap.get(makeRecordKey(employeeId, day));
    if (existing) return existing;
    return { employeeId, day, apontador: '', supervisor: '' };
  }, [recordsMap]);

  // Dispara autosave com debounce (cancela timer anterior). Chamado em cada edição.
  const triggerAutosaveRef = useRef<() => void>(() => {});
  const triggerAutosave = useCallback(() => {
    if (autosavePausedRef.current) return;
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(async () => {
      autosaveTimerRef.current = null;
      if (isSavingRef.current) {
        pendingAfterSaveRef.current = true;
        return;
      }
      isSavingRef.current = true;
      setAutosaveStatus('saving');
      try {
        console.debug('[autosave] disparando saveAll');
        const ok = await saveAllRef.current();
        if (ok) {
          setAutosaveStatus('saved');
          if (savedFlashTimeoutRef.current) window.clearTimeout(savedFlashTimeoutRef.current);
          savedFlashTimeoutRef.current = window.setTimeout(() => setAutosaveStatus('idle'), 2000);
        } else {
          setAutosaveStatus('error');
        }
      } catch (e) {
        console.error('[autosave] erro', e);
        setAutosaveStatus('error');
      } finally {
        isSavingRef.current = false;
        if (pendingAfterSaveRef.current) {
          pendingAfterSaveRef.current = false;
          window.setTimeout(() => triggerAutosaveRef.current(), 300);
        }
      }
    }, 800) as unknown as number;
  }, []);
  useEffect(() => { triggerAutosaveRef.current = triggerAutosave; }, [triggerAutosave]);

  // Força salvamento imediato: cancela debounce e aguarda saveAll completar.
  // Usado quando precisamos garantir persistência (ex.: confirmar modal de justificativa,
  // beforeunload, troca de role/usuário).
  const flushAutosave = useCallback(async (): Promise<boolean> => {
    if (autosavePausedRef.current) return true;
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    // Se já há um save em andamento, espera ele terminar antes de disparar outro.
    while (isSavingRef.current) {
      await new Promise((r) => window.setTimeout(r, 50));
    }
    isSavingRef.current = true;
    setAutosaveStatus('saving');
    try {
      const ok = await saveAllRef.current();
      if (ok) {
        setAutosaveStatus('saved');
        if (savedFlashTimeoutRef.current) window.clearTimeout(savedFlashTimeoutRef.current);
        savedFlashTimeoutRef.current = window.setTimeout(() => setAutosaveStatus('idle'), 2000);
      } else {
        setAutosaveStatus('error');
      }
      return !!ok;
    } catch (e) {
      console.error('[flushAutosave] erro', e);
      setAutosaveStatus('error');
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, []);

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
      // Use a map lookup for O(1) instead of findIndex O(N)
      const existingIndex = new Map<string, number>();
      for (let i = 0; i < prev.length; i++) {
        existingIndex.set(makeRecordKey(prev[i].employeeId, prev[i].day), i);
      }
      const idx = existingIndex.get(key);
      if (idx !== undefined) {
        const updated = [...prev];
        const existing = updated[idx];
        // se o apontador mudou, sincroniza no supervisor salvo, exceto quando o supervisor
        // já tem uma justificativa de abono (AT/ABF/ABT) — nesses casos não sobrescreve.
        if (field === 'apontador') {
          const supervisorVal = JUST_CODES_TO_PREFILL.includes(existing.supervisor as AttendanceCode)
            ? existing.supervisor
            : value;
          updated[idx] = { ...existing, apontador: value, supervisor: supervisorVal };
        } else {
          updated[idx] = { ...existing, [field]: value };
        }
        return updated;
      }

      // não existe ainda — criamos record e, por padrão, sincronizamos supervisor com apontador
      if (field === 'apontador') {
        return [...prev, { employeeId, day, apontador: value, supervisor: value }];
      }
      // field é 'supervisor' — criar novo record
      return [...prev, { employeeId, day, apontador: '', supervisor: value }];
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
    } else if (field === 'supervisor' && !JUST_CODES_TO_PREFILL.includes(value as AttendanceCode)) {
      // Código mudou PARA não-justificativa (P, F, '', FOLGA etc.) — remover justificativa local e no servidor
      setJustifications(prev => {
        const toRemove = prev.find(j => j.employeeId === employeeId && j.day === day);
        if (!toRemove) return prev;
        if (accessToken) {
          void fetch('/api/attendance/justifications', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ id: toRemove.id, employeeId, day }),
          }).catch(() => {});
        }
        return prev.filter(j => !(j.employeeId === employeeId && j.day === day));
      });
    }
    triggerAutosave();
  }, [employeesState, daysInMonth, accessToken, triggerAutosave]);

  // Batch update multiple records in a single setState call (avoids N re-renders)
  const updateRecordsBatch = useCallback((
    updates: Array<{ employeeId: string; day: string; field: 'apontador' | 'supervisor'; value: AttendanceCode }>
  ) => {
    if (updates.length === 0) return;
    setHasUnsavedChanges(true);
    setDirtyRecordKeys(prev => {
      const next = new Set(prev);
      for (const u of updates) next.add(makeRecordKey(u.employeeId, u.day));
      return next;
    });
    setRecords(prev => {
      const map = new Map<string, AttendanceRecord>();
      for (const r of prev) map.set(makeRecordKey(r.employeeId, r.day), r);
      const JUST_CODES: AttendanceCode[] = ['AT', 'ABF', 'ABT'];
      for (const u of updates) {
        const key = makeRecordKey(u.employeeId, u.day);
        const existing = map.get(key);
        if (existing) {
          if (u.field === 'apontador') {
            const supervisorVal = JUST_CODES.includes(existing.supervisor as AttendanceCode)
              ? existing.supervisor
              : u.value;
            map.set(key, { ...existing, apontador: u.value, supervisor: supervisorVal });
          } else {
            map.set(key, { ...existing, [u.field]: u.value });
          }
        } else {
          if (u.field === 'apontador') {
            map.set(key, { employeeId: u.employeeId, day: u.day, apontador: u.value, supervisor: u.value });
          } else {
            map.set(key, { employeeId: u.employeeId, day: u.day, apontador: '', supervisor: u.value });
          }
        }
      }
      return Array.from(map.values());
    });
    triggerAutosave();
  }, [triggerAutosave]);

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

        // Atualizar ID temporário com o ID real do MongoDB
        const justData = await justRes.json().catch(() => null);
        if (justData?.saved?.[0]?._id) {
          const realId = String(justData.saved[0]._id);
          setJustifications(prev => prev.map(j =>
            j.id === newJustification.id ? { ...j, id: realId } : j
          ));
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

  const OCORRENCIA_CODES = ['F', 'FT', 'FM', 'AT', 'ABF', 'ABT'];

  const getTotals = useCallback((day: string) => {
    let total = 0;
    filteredEmployees.forEach(emp => {
      const record = getRecord(emp.id, day);
      if (OCORRENCIA_CODES.includes(record.apontador) || OCORRENCIA_CODES.includes(record.supervisor)) {
        total++;
      }
    });
    return total;
  }, [filteredEmployees, getRecord]);

  const getEmployeeFaltas = useCallback((employeeId: string) => {
    let total = 0;
    daysInMonth.forEach(dayInfo => {
      if (dayInfo.isSunday || dayInfo.isHoliday) return;
      const record = getRecord(employeeId, dayInfo.day);
      if (OCORRENCIA_CODES.includes(record.apontador) || OCORRENCIA_CODES.includes(record.supervisor)) {
        total++;
      }
    });
    return total;
  }, [daysInMonth, getRecord]);

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
      // Snapshot das chaves sujas no início — apenas estas serão limpas no final.
      // Edições novas do usuário durante o save são preservadas.
      const savingKeys = new Set(dirtyRecordKeys);
      const recordsToSave = savingKeys.size > 0
        ? records.filter((r) => savingKeys.has(makeRecordKey(r.employeeId, r.day)))
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

      // Atualizar IDs reais das justificativas usando a resposta do POST acima — sem
      // refazer GET (evita sobrescrever edições recentes do usuário durante o save).
      // O GET completo continua acontecendo no load Effect quando hasUnsavedChanges === false.

      // Limpa apenas as chaves que ENTRARAM no save (preserva edições novas)
      setDirtyRecordKeys(prev => {
        if (prev.size === 0) return prev;
        const next = new Set<string>();
        for (const k of prev) if (!savingKeys.has(k)) next.add(k);
        return next;
      });
      // hasUnsavedChanges só vira false se não houver chaves sujas remanescentes
      setDirtyRecordKeys(prev => {
        if (prev.size === 0) {
          setHasUnsavedChanges(false);
        }
        return prev;
      });

      return true;
    } catch (e) {
      console.error('Failed to save attendance', e);
      return false;
    }
  }, [records, justifications, accessToken, dirtyRecordKeys, employeesById]);

  // Sincronizar saveAll mais recente no ref usado pelo autosave
  useEffect(() => { saveAllRef.current = saveAll; }, [saveAll]);

  // Permitir ao consumidor pausar/retomar autosave (ex.: m\u00eas bloqueado, expectador)
  const setAutosavePaused = useCallback((paused: boolean) => {
    autosavePausedRef.current = paused;
    if (paused && autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

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
    updateRecordsBatch,
    clearAll,
    addJustification,
    removeJustification,
    getTotals,
    getEmployeeFaltas,
    generateExportData,
    saveAll,
    refreshData,
    hasUnsavedChanges,
    autosaveStatus,
    setAutosavePaused,
    flushAutosave,
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
