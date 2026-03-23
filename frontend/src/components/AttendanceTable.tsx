import { useState } from 'react';
import { format } from 'date-fns';
import { Employee, DayInfo, AttendanceRecord, AttendanceCode } from '@/types/attendance';
import { AttendanceCell } from './AttendanceCell';
import { cn } from '@/lib/utils';

interface AttendanceTableProps {
  employees: Employee[];
  daysInMonth: DayInfo[];
  getRecord: (employeeId: string, day: string) => AttendanceRecord;
  updateRecord: (employeeId: string, day: string, field: 'apontador' | 'supervisor', value: AttendanceCode) => void;
  getTotals: (day: string) => number;
  currentUserRole: 'admin' | 'supervisor' | 'expectador';
  supervisorName?: string;
  storeName?: string;
  periodLabel: string;
  onSave?: () => Promise<boolean>;
  isMonthLocked?: boolean;
}

export function AttendanceTable({
  employees,
  daysInMonth,
  getRecord,
  updateRecord,
  getTotals,
  currentUserRole,
  supervisorName,
  storeName,
  periodLabel,
  onSave,
  isMonthLocked = false,
}: AttendanceTableProps) {
  const [bulkCodeByDay, setBulkCodeByDay] = useState<Record<string, string>>({});
  const isAdmin = currentUserRole === 'admin';
  const isSupervisor = currentUserRole === 'supervisor';
  const isEditDisabled = isSupervisor && isMonthLocked;
  // calcular largura mínima da tabela dinamicamente: larguras fixas das colunas iniciais + colunas de dias
  const fixedColsWidth = 220 + 100 + 40; // largura aproximada das 3 colunas fixas (FUNC, FUNÇÃO, APT/SUP)
  const dayColWidth = 36; // largura por dia (inclui padding/margem)
  const tableMinWidth = Math.max(1400, fixedColsWidth + (daysInMonth.length * dayColWidth));
  function setAllPresentForDay(day: string) {
    if (!isAdmin) return; // proteger ação para admins apenas
    const dayInfo = daysInMonth.find(d => d.day === day);
    if (!dayInfo) return;
    // Não marcar domingos
    if (dayInfo.isSunday) return;
    for (const emp of employees) {
      updateRecord(emp.id, day, 'apontador', 'P');
    }
  }

  function applyCodeToAll(day: string, code: string) {
    if (!isAdmin) return;
    const dayInfo = daysInMonth.find(d => d.day === day);
    if (!dayInfo) return;
    if (dayInfo.isSunday) return;

    for (const emp of employees) {
      if (!code) {
        // clear to empty (interpreted as FOLGA by export if both blank)
        updateRecord(emp.id, day, 'apontador', '');
        updateRecord(emp.id, day, 'supervisor', '');
      } else if (code === 'FER') {
        updateRecord(emp.id, day, 'apontador', 'FER');
        updateRecord(emp.id, day, 'supervisor', 'FER');
      } else if (code === 'FOLGA') {
        updateRecord(emp.id, day, 'apontador', 'FOLGA');
        updateRecord(emp.id, day, 'supervisor', 'FOLGA');
      } else {
        // default: apply to apontador and let sync handle supervisor
        updateRecord(emp.id, day, 'apontador', code as AttendanceCode);
      }
    }
  }
  function setAllHolidayForDay(day: string) {
    if (!isAdmin) return; // somente admin
    const dayInfo = daysInMonth.find(d => d.day === day);
    if (!dayInfo) return;
    // não aplicamos feriado automático em domingos
    if (dayInfo.isSunday) return;
    for (const emp of employees) {
      // marcar FER tanto em apontador quanto em supervisor
      updateRecord(emp.id, day, 'apontador', 'FER');
      updateRecord(emp.id, day, 'supervisor', 'FER');
    }
  }

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <div style={{ minWidth: `${tableMinWidth}px` }}>
        {/* Month Lock Warning */}
        {isEditDisabled && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <span className="font-semibold">🔒 Mês Bloqueado</span> - Este mês foi bloqueado pelo administrador. Você pode apenas visualizar os dados. Para fazer alterações, aguarde a liberação do administrador.
          </div>
        )}

        {/* Header with store and period info */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h2 className="text-lg font-bold text-primary">{storeName || 'TODOS FUNCIONÁRIOS'}</h2>
            {supervisorName && (
              <p className="text-sm text-muted-foreground">SUPERVISOR: {supervisorName}</p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-base font-semibold text-foreground">PLANILHA DE APONTAMENTO DE PRESENÇA</h3>
            <p className="text-sm text-primary font-medium">{periodLabel}</p>
            {onSave && currentUserRole !== 'expectador' && !isEditDisabled && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      (event as any)?.preventDefault?.();
                      const ok = await onSave();
                      if (ok) alert('Registros salvos com sucesso');
                      else alert('Falha ao salvar registros');
                    } catch (e) { console.error(e); alert('Erro ao salvar'); }
                  }}
                  className="px-3 py-1 bg-primary text-white rounded text-sm"
                >
                  Salvar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg">
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
                      <div className="flex flex-col items-center gap-1">
                      <div className="text-sm font-semibold">{format(dayInfo.date, 'd')}</div>
                      <div className="mt-1">
                        <select
                          value={bulkCodeByDay[dayInfo.day] ?? ''}
                          onChange={(e) => {
                            const code = (e.target.value as AttendanceCode) || '';
                            setBulkCodeByDay((s) => ({ ...s, [dayInfo.day]: code }));
                            // aplicar automaticamente ao selecionar
                            applyCodeToAll(dayInfo.day, code);
                          }}
                          className="h-7 text-[10px] rounded border px-1"
                          disabled={dayInfo.isSunday || !isAdmin}
                          title={dayInfo.isSunday ? 'Operação não disponível em domingos' : isAdmin ? 'Selecione o código para aplicar a todos' : 'Apenas o Apontador pode selecionar'}
                        >
                          <option value="">— (limpar)</option>
                          <option value="P">P</option>
                          <option value="F">F</option>
                          <option value="FT">FT</option>
                          <option value="FM">FM</option>
                          <option value="FER">FER</option>
                          <option value="FOLGA">FOLGA</option>
                        </select>
                      </div>
                    </div>
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
                    <td className="border-r border-border/30 px-2 py-1 font-medium text-[10px] text-foreground sticky left-0 bg-card z-10 uppercase">
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
                        <td key={dayInfo.day} className="border-r border-border/30 p-0 w-[28px] h-[44px]">
                          <AttendanceCell
                            dayInfo={dayInfo}
                            apontadorValue={record.apontador}
                            supervisorValue={record.supervisor}
                            onApontadorChange={(value) => updateRecord(employee.id, dayInfo.day, 'apontador', value)}
                            onSupervisorChange={(value) => updateRecord(employee.id, dayInfo.day, 'supervisor', value)}
                            currentUserRole={currentUserRole}
                            isDisabled={isEditDisabled}
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
