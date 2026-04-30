import { memo } from 'react';
import { AttendanceCode, APONTADOR_CODES, SUPERVISOR_CODES, DayInfo } from '@/types/attendance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Paperclip } from 'lucide-react';

interface AttendanceCellProps {
  dayInfo: DayInfo;
  employeeId: string;
  employeeName: string;
  apontadorValue: AttendanceCode;
  supervisorValue: AttendanceCode;
  onApontadorChange: (employeeId: string, day: string, value: AttendanceCode) => void;
  onSupervisorChange: (employeeId: string, day: string, value: AttendanceCode, employeeName: string) => void;
  currentUserRole: 'admin' | 'gerente' | 'supervisor' | 'expectador';
  isDisabled?: boolean;
  isAtPending?: boolean;
  onRequestAtUpload?: (employeeId: string, day: string, employeeName: string) => void;
}

function getCellClass(value: AttendanceCode, dayInfo: DayInfo): string {
  if (dayInfo.isSunday) return 'cell-sunday';
  
  switch (value) {
    case 'P':
      return 'cell-present';
    case 'F':
      return 'cell-absent';
    case 'FT':
      return 'cell-falta-tarde';
    case 'FM':
      return 'cell-falta-manha';
    case 'AT':
      return 'cell-atestado';
    case 'ABF':
      return 'cell-abono-falta';
    case 'ABT':
      return 'cell-abono-trab';
    case 'FER':
    case 'FERI':
      return 'cell-holiday';
    case 'FOLGA':
      return 'cell-folga';
    default:
      return '';
  }
}

export const AttendanceCell = memo(function AttendanceCell({
  dayInfo,
  employeeId,
  employeeName,
  apontadorValue,
  supervisorValue,
  onApontadorChange,
  onSupervisorChange,
  currentUserRole,
  isDisabled = false,
  isAtPending = false,
  onRequestAtUpload,
}: AttendanceCellProps) {
  // Apenas domingos são bloqueados visualmente. Mês bloqueado (isDisabled) apenas torna read-only.
  const isBlocked = dayInfo.isSunday;
  const displayLabel = dayInfo.isSunday ? 'DOM' : '';

  if (isBlocked) {
    return (
      <div className="flex flex-col gap-px h-full">
        <div className={cn(
          "flex-1 flex items-center justify-center text-[10px] font-medium min-h-[20px]",
          dayInfo.isSunday ? "cell-sunday" : "cell-holiday"
        )}>
          {displayLabel}
        </div>
        <div className={cn(
          "flex-1 flex items-center justify-center text-[10px] font-medium min-h-[20px]",
          dayInfo.isSunday ? "cell-sunday" : "cell-holiday"
        )}>
          {displayLabel}
        </div>
      </div>
    );
  }

  // Check if apontador left blank - blocks supervisor justification
  const apontadorBlank = apontadorValue === '';
  const canJustify = !apontadorBlank || supervisorValue !== '';

  const apontadorEditable = currentUserRole === 'admin' && !isDisabled;
  const supervisorEditable = (currentUserRole === 'admin' || currentUserRole === 'supervisor') && !isDisabled;

  return (
    <div className="flex flex-col gap-px h-full">
      {/* Apontador row */}
      <div className={cn(
        "flex-1 min-h-[20px]",
        getCellClass(apontadorValue, dayInfo)
      )}>
        {apontadorEditable ? (
          <Select
            value={apontadorValue || 'empty'}
            onValueChange={(v) => onApontadorChange(employeeId, dayInfo.day, v === 'empty' ? '' : v as AttendanceCode)}
          >
            <SelectTrigger className="h-5 w-full border-0 bg-transparent text-[10px] font-semibold p-0 justify-center focus:ring-0">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empty">-</SelectItem>
              {APONTADOR_CODES.filter(c => c !== '').map(code => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] font-semibold">
            {apontadorValue || '-'}
          </div>
        )}
      </div>
      
      {/* Supervisor row */}
      <div className={cn(
        "flex-1 min-h-[20px] border-t border-border/30 relative",
        getCellClass(supervisorValue, dayInfo),
        supervisorValue === 'AT' && isAtPending && "ring-1 ring-amber-500 ring-inset"
      )}>
        <Select
          value={supervisorValue || 'empty'}
          onValueChange={(v) => onSupervisorChange(employeeId, dayInfo.day, v === 'empty' ? '' : v as AttendanceCode, employeeName)}
          disabled={!supervisorEditable}
        >
          <SelectTrigger className="h-5 w-full border-0 bg-transparent text-[10px] font-semibold p-0 justify-center focus:ring-0 disabled:opacity-50">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="empty">-</SelectItem>
            {SUPERVISOR_CODES.filter(c => c !== '').map(code => (
              <SelectItem key={code} value={code}>{code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {supervisorValue === 'AT' && isAtPending && supervisorEditable && onRequestAtUpload && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestAtUpload(employeeId, dayInfo.day, employeeName);
            }}
            title="Anexar arquivo do atestado"
            className="absolute -top-0.5 -right-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-3 h-3 flex items-center justify-center shadow-sm"
          >
            <Paperclip className="w-2 h-2" strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
});
