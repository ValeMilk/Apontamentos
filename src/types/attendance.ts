export type AttendanceCode = 'P' | 'F' | 'FT' | 'FM' | 'AT' | 'ABF' | 'ABT' | 'DOM' | 'FER' | 'FOLGA' | '';

export type UserRole = 'admin' | 'supervisor';

export interface Employee {
  id: string;
  name: string;
  role: string;
  supervisorId: string;
}

export interface Supervisor {
  id: string;
  name: string;
  store: string;
}

export interface AttendanceRecord {
  employeeId: string;
  day: number;
  apontador: AttendanceCode;
  supervisor: AttendanceCode;
}

export interface Justification {
  id: string;
  employeeId: string;
  day: number;
  text: string;
}

export interface DayInfo {
  day: number;
  date: Date;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export const APONTADOR_CODES: AttendanceCode[] = ['P', 'F', 'FT', 'FM', ''];
export const SUPERVISOR_CODES: AttendanceCode[] = ['P', 'F', 'FT', 'FM', 'AT', 'ABF', 'ABT', ''];

export const CODE_LABELS: Record<AttendanceCode, string> = {
  'P': 'Presente',
  'F': 'Falta',
  'FT': 'Falta Tarde',
  'FM': 'Falta Manhã',
  'AT': 'Atestado',
  'ABF': 'Abono Falta',
  'ABT': 'Abono Trabalhado',
  'DOM': 'Domingo',
  'FER': 'Feriado',
  'FOLGA': 'Folga',
  '': 'Vazio',
};
