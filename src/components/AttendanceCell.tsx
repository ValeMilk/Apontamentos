import { AttendanceCode, APONTADOR_CODES, SUPERVISOR_CODES, DayInfo } from '@/types/attendance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AttendanceCellProps {
  dayInfo: DayInfo;
  apontadorValue: AttendanceCode;
  supervisorValue: AttendanceCode;
  onApontadorChange: (value: AttendanceCode) => void;
  onSupervisorChange: (value: AttendanceCode) => void;
  isAdmin: boolean;
}

function getCellClass(value: AttendanceCode, dayInfo: DayInfo): string {
  if (dayInfo.isSunday) return 'cell-sunday';
  if (dayInfo.isHoliday) return 'cell-holiday';
  
  switch (value) {
    case 'P':
      return 'cell-present';
    case 'F':
    case 'FT':
    case 'FM':
      return 'cell-absent';
    case 'AT':
    case 'ABF':
    case 'ABT':
      return 'cell-justified';
    default:
      return '';
  }
}

export function AttendanceCell({
  dayInfo,
  apontadorValue,
  supervisorValue,
  onApontadorChange,
  onSupervisorChange,
  isAdmin,
}: AttendanceCellProps) {
  const isBlocked = dayInfo.isSunday || dayInfo.isHoliday;
  const displayLabel = dayInfo.isSunday ? 'DOM' : dayInfo.isHoliday ? 'FER' : '';

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

  return (
    <div className="flex flex-col gap-px h-full">
      {/* Apontador row */}
      <div className={cn(
        "flex-1 min-h-[20px]",
        getCellClass(apontadorValue, dayInfo)
      )}>
        {isAdmin ? (
          <Select
            value={apontadorValue || 'empty'}
            onValueChange={(v) => onApontadorChange(v === 'empty' ? '' : v as AttendanceCode)}
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
        "flex-1 min-h-[20px] border-t border-border/30",
        getCellClass(supervisorValue, dayInfo)
      )}>
        <Select
          value={supervisorValue || 'empty'}
          onValueChange={(v) => onSupervisorChange(v === 'empty' ? '' : v as AttendanceCode)}
          disabled={apontadorBlank && !isAdmin}
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
      </div>
    </div>
  );
}
