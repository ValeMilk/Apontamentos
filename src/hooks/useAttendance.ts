import { useState, useCallback, useMemo } from 'react';
import { AttendanceRecord, AttendanceCode, DayInfo, Justification } from '@/types/attendance';
import { employees, supervisors, holidays } from '@/data/mockData';
import { format, getDaysInMonth, isSunday, startOfMonth, addDays } from 'date-fns';

export function useAttendance() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Janeiro 2026
  const [selectedSupervisor, setSelectedSupervisor] = useState<string | 'all'>('all');
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'supervisor'>('admin');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);

  const daysInMonth = useMemo(() => {
    const startDate = startOfMonth(currentDate);
    const totalDays = getDaysInMonth(currentDate);
    const days: DayInfo[] = [];

    for (let i = 0; i < totalDays; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      days.push({
        day: i + 1,
        date,
        isSunday: isSunday(date),
        isHoliday: !!holidays[dateStr],
        holidayName: holidays[dateStr],
      });
    }

    return days;
  }, [currentDate]);

  const filteredEmployees = useMemo(() => {
    if (selectedSupervisor === 'all') {
      return employees;
    }
    return employees.filter(emp => emp.supervisorId === selectedSupervisor);
  }, [selectedSupervisor]);

  const currentSupervisor = useMemo(() => {
    if (selectedSupervisor === 'all') return null;
    return supervisors.find(s => s.id === selectedSupervisor);
  }, [selectedSupervisor]);

  const getRecord = useCallback((employeeId: string, day: number): AttendanceRecord => {
    const existing = records.find(r => r.employeeId === employeeId && r.day === day);
    if (existing) return existing;
    return { employeeId, day, apontador: '', supervisor: '' };
  }, [records]);

  const updateRecord = useCallback((
    employeeId: string,
    day: number,
    field: 'apontador' | 'supervisor',
    value: AttendanceCode
  ) => {
    setRecords(prev => {
      const index = prev.findIndex(r => r.employeeId === employeeId && r.day === day);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      }
      return [...prev, { employeeId, day, apontador: '', supervisor: '', [field]: value }];
    });
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
    setJustifications([]);
  }, []);

  const addJustification = useCallback((employeeId: string, day: number, text: string) => {
    setJustifications(prev => [
      ...prev,
      { id: `just-${Date.now()}`, employeeId, day, text }
    ]);
  }, []);

  const removeJustification = useCallback((id: string) => {
    setJustifications(prev => prev.filter(j => j.id !== id));
  }, []);

  const getTotals = useCallback((day: number) => {
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
        } else if (dayInfo.isHoliday) {
          finalValue = 'FER';
        } else {
          finalValue = record.supervisor || record.apontador || 'FOLGA';
        }
        
        row[`dia_${dayInfo.day}`] = finalValue;
      });
      
      data.push(row);
    });
    
    return data;
  }, [filteredEmployees, daysInMonth, getRecord]);

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
    supervisors,
    getRecord,
    updateRecord,
    clearAll,
    addJustification,
    removeJustification,
    getTotals,
    generateExportData,
  };
}
