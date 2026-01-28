import { Employee, DayInfo, AttendanceRecord, AttendanceCode } from '@/types/attendance';
import { AttendanceCell } from './AttendanceCell';
import { cn } from '@/lib/utils';

interface AttendanceTableProps {
  employees: Employee[];
  daysInMonth: DayInfo[];
  getRecord: (employeeId: string, day: number) => AttendanceRecord;
  updateRecord: (employeeId: string, day: number, field: 'apontador' | 'supervisor', value: AttendanceCode) => void;
  getTotals: (day: number) => number;
  isAdmin: boolean;
  supervisorName?: string;
  storeName?: string;
  periodLabel: string;
}

export function AttendanceTable({
  employees,
  daysInMonth,
  getRecord,
  updateRecord,
  getTotals,
  isAdmin,
  supervisorName,
  storeName,
  periodLabel,
}: AttendanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1400px]">
        {/* Header with store and period info */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h2 className="text-lg font-bold text-primary">{storeName || 'TODAS AS LOJAS'}</h2>
            {supervisorName && (
              <p className="text-sm text-muted-foreground">SUPERVISOR: {supervisorName}</p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-base font-semibold text-foreground">PLANILHA DE APONTAMENTO DE PRESENÇA</h3>
            <p className="text-sm text-primary font-medium">{periodLabel}</p>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="table-header-cell border-r border-border/30 px-2 py-2 text-left w-[220px] sticky left-0 z-10">
                  FUNCIONÁRIOS
                </th>
                <th className="table-header-cell border-r border-border/30 px-2 py-2 text-left w-[100px]">
                  FUNÇÃO
                </th>
                <th className="table-header-cell border-r border-border/30 px-1 py-1 w-[40px] text-center text-[9px]">
                  <div>APT</div>
                  <div>SUP</div>
                </th>
                {daysInMonth.map((dayInfo) => (
                  <th
                    key={dayInfo.day}
                    className={cn(
                      "border-r border-border/30 px-0.5 py-1 w-[28px] text-center text-[10px]",
                      dayInfo.isSunday ? "cell-sunday" : dayInfo.isHoliday ? "cell-holiday" : "table-header-cell"
                    )}
                  >
                    {dayInfo.day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => {
                return (
                  <tr 
                    key={employee.id}
                    className={cn(
                      "border-t border-border/50",
                      index % 2 === 1 && "bg-table-row-alt"
                    )}
                  >
                    <td className="border-r border-border/30 px-2 py-1 font-medium text-[10px] text-foreground sticky left-0 bg-card z-10">
                      {employee.name}
                    </td>
                    <td className="border-r border-border/30 px-2 py-1 text-[10px] text-muted-foreground">
                      {employee.role}
                    </td>
                    <td className="border-r border-border/30 px-0.5 py-0.5 w-[40px]">
                      <div className="flex flex-col text-[8px] text-center text-muted-foreground">
                        <span className="border-b border-border/30 py-0.5">APT</span>
                        <span className="py-0.5">SUP</span>
                      </div>
                    </td>
                    {daysInMonth.map((dayInfo) => {
                      const record = getRecord(employee.id, dayInfo.day);
                      return (
                        <td
                          key={dayInfo.day}
                          className="border-r border-border/30 p-0 w-[28px] h-[44px]"
                        >
                          <AttendanceCell
                            dayInfo={dayInfo}
                            apontadorValue={record.apontador}
                            supervisorValue={record.supervisor}
                            onApontadorChange={(value) => updateRecord(employee.id, dayInfo.day, 'apontador', value)}
                            onSupervisorChange={(value) => updateRecord(employee.id, dayInfo.day, 'supervisor', value)}
                            isAdmin={isAdmin}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-primary">
                <td colSpan={2} className="px-2 py-2 font-bold text-[11px] text-foreground">
                  TOTAL DE FUNCIONÁRIOS
                </td>
                <td className="text-center font-bold text-[11px]">{employees.length}</td>
                <td colSpan={daysInMonth.length} />
              </tr>
              <tr className="border-t border-border">
                <td colSpan={2} className="px-2 py-2 font-bold text-[11px] text-destructive">
                  TOTAL FALTAS
                </td>
                <td />
                {daysInMonth.map((dayInfo) => (
                  <td 
                    key={dayInfo.day} 
                    className={cn(
                      "text-center text-[10px] font-semibold",
                      dayInfo.isSunday || dayInfo.isHoliday ? "text-muted-foreground" : "text-destructive"
                    )}
                  >
                    {dayInfo.isSunday || dayInfo.isHoliday ? '-' : getTotals(dayInfo.day)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
