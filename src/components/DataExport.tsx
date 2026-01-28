import { Employee, DayInfo, AttendanceRecord } from '@/types/attendance';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface DataExportProps {
  employees: Employee[];
  daysInMonth: DayInfo[];
  getRecord: (employeeId: string, day: number) => AttendanceRecord;
  periodLabel: string;
}

export function DataExport({
  employees,
  daysInMonth,
  getRecord,
  periodLabel,
}: DataExportProps) {
  const generateData = () => {
    const data: Record<string, any>[] = [];

    employees.forEach(emp => {
      const row: Record<string, string> = {
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
          // Prioritize supervisor value, then apontador, then FOLGA
          finalValue = record.supervisor || record.apontador || 'FOLGA';
        }

        row[`dia_${dayInfo.day}`] = finalValue;
      });

      data.push(row);
    });

    return data;
  };

  const handleExport = () => {
    const data = generateData();
    const headers = ['funcionario', 'funcao', ...daysInMonth.map(d => `dia_${d.day}`)];
    
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h] || '').join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apontamento_${periodLabel.replace(/\s/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 border border-border rounded-lg overflow-hidden">
      <div className="table-header-cell px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">BASE DE DADOS - EXPORTAÇÃO</h3>
        <Button onClick={handleExport} size="sm" variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-xs border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-2 py-1.5 text-left font-medium w-[200px]">Funcionário</th>
              <th className="border border-border px-2 py-1.5 text-left font-medium w-[100px]">Função</th>
              {daysInMonth.map(d => (
                <th key={d.day} className="border border-border px-1 py-1.5 text-center font-medium w-[35px]">
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => {
              return (
                <tr key={emp.id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                  <td className="border border-border px-2 py-1 font-medium truncate max-w-[200px]">
                    {emp.name}
                  </td>
                  <td className="border border-border px-2 py-1 text-muted-foreground">
                    {emp.role}
                  </td>
                  {daysInMonth.map(dayInfo => {
                    const record = getRecord(emp.id, dayInfo.day);
                    let value = '';
                    let cellClass = '';

                    if (dayInfo.isSunday) {
                      value = 'DOM';
                      cellClass = 'bg-status-sunday/30';
                    } else if (dayInfo.isHoliday) {
                      value = 'FER';
                      cellClass = 'bg-status-holiday/30';
                    } else {
                      value = record.supervisor || record.apontador || 'FOLGA';
                      if (value === 'FOLGA') cellClass = 'bg-muted text-muted-foreground';
                      else if (value === 'P') cellClass = 'bg-status-present/20 text-status-present font-semibold';
                      else if (['F', 'FT', 'FM'].includes(value)) cellClass = 'bg-status-absent/20 text-status-absent font-semibold';
                      else if (['AT', 'ABF', 'ABT'].includes(value)) cellClass = 'bg-status-justified/20 text-status-justified font-semibold';
                    }

                    return (
                      <td 
                        key={dayInfo.day} 
                        className={`border border-border px-1 py-1 text-center ${cellClass}`}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
