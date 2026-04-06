export type AttendanceCode = 'P' | 'F' | 'FT' | 'FM' | 'AT' | 'ABF' | 'ABT' | 'DOM' | 'FER' | 'FERI' | 'FOLGA' | '';

export type UserRole = 'admin' | 'gerente' | 'supervisor' | 'expectador';

export interface Employee {
  id: string;
  name: string;
  role: string;
  supervisorId: string;
  supervisorUserId?: string;
}

export interface Supervisor {
  id: string;
  name: string;
  store: string;
  supervisorId?: string;
}

export interface AttendanceRecord {
  employeeId: string;
  day: string; // ISO date YYYY-MM-DD
  apontador: AttendanceCode;
  supervisor: AttendanceCode;
}

export interface Justification {
  id: string;
  employeeId: string;
  day: string; // ISO date YYYY-MM-DD
  text: string;
  attestFile?: string; // path like "atestados/uuid.jpg", served at /uploads/atestados/uuid.jpg
}

export interface DayInfo {
  day: string; // ISO date YYYY-MM-DD
  date: Date;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export const APONTADOR_CODES: AttendanceCode[] = ['P', 'F', 'FT', 'FM', 'FOLGA', ''];
export const SUPERVISOR_CODES: AttendanceCode[] = ['P', 'F', 'FT', 'FM', 'AT', 'ABF', 'ABT', 'FERI', 'FOLGA', ''];

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
  'FERI': 'Férias',
  'FOLGA': 'Folga',
  '': 'Vazio',
};
