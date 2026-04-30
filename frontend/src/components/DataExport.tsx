import { Employee, DayInfo, AttendanceRecord, AttendanceCode, CODE_LABELS, Supervisor } from '@/types/attendance';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface DataExportProps {
  employees: Employee[];
  daysInMonth: DayInfo[];
  getRecord: (employeeId: string, day: string) => AttendanceRecord;
  periodLabel: string;
  supervisors: Supervisor[];
}

export function DataExport({
  employees,
  daysInMonth,
  getRecord,
  periodLabel,
  supervisors,
}: DataExportProps) {
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('all');
  // Generate rows: one row per (day, employee)
  const generateData = () => {
    const rows: Record<string, string>[] = [];

    const WEEKDAY_ABBR_PT = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
    const employeesToUse = selectedSupervisor === 'all' ? employees : employees.filter(e => (e as any).supervisorUserId === selectedSupervisor);

    daysInMonth.forEach(dayInfo => {
      const dateLabel = format(dayInfo.date, 'dd/MM/yyyy');
      const dayOfWeek = WEEKDAY_ABBR_PT[dayInfo.date.getDay()];
      employeesToUse.forEach(emp => {
        const record = getRecord(emp.id, dayInfo.day);

        let supportCode: AttendanceCode | string;
        let supervisorCode: AttendanceCode | string;

        if (dayInfo.isSunday) {
          supportCode = 'DOM';
          supervisorCode = 'DOM';
        } else if (dayInfo.isHoliday) {
          supportCode = 'FER';
          supervisorCode = 'FER';
        } else {
          supportCode = record.apontador || 'FOLGA';
          supervisorCode = record.supervisor || record.apontador || 'FOLGA';
        }

        const supportLabel = (CODE_LABELS as Record<string, string>)[supportCode] || String(supportCode);
        const supervisorLabel = (CODE_LABELS as Record<string, string>)[supervisorCode] || String(supervisorCode);

        rows.push({
          DATA: dateLabel,
          'DIA DA SEMANA': dayOfWeek,
          'VENDEDOR/PROMOTOR': emp.name,
          SUPORTE: supportLabel,
          COMERCIAL: supervisorLabel,
        });
      });
    });

    return rows;
  };

  const handleExport = () => {
    const data = generateData();
    const headers = ['DATA', 'DIA DA SEMANA', 'VENDEDOR/PROMOTOR', 'SUPORTE', 'COMERCIAL'];

    // Normaliza string: remove acentos e caracteres especiais problemáticos no Excel
    const sanitize = (v: string): string =>
      v
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/[\u2013\u2014]/g, '-')  // em dash / en dash -> hyphen
        .replace(/[\u00a0]/g, ' ')        // non-breaking space -> space
        .trim();

    const escapeCSV = (v: string) => `"${sanitize(v).replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCSV).join(','),
      ...data.map(row => headers.map(h => escapeCSV(row[h] || '')).join(','))
    ].join('\r\n'); // CRLF para compatibilidade Excel Windows

    // BOM UTF-8 garante que Excel reconheça a codificação corretamente
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apontamento_${periodLabel.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 border border-border rounded-lg overflow-hidden">
      <div className="table-header-cell px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">BASE DE DADOS - EXPORTAÇÃO</h3>
          <select
            value={selectedSupervisor}
            onChange={(e) => setSelectedSupervisor(e.target.value)}
            className="border px-2 py-1 rounded text-sm text-foreground bg-background"
          >
            <option value="all">Todos Supervisores</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleExport} size="sm" variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-xs border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-2 py-1.5 text-left font-medium w-[120px]">DATA</th>
              <th className="border border-border px-2 py-1.5 text-left font-medium w-[120px]">DIA DA SEMANA</th>
              <th className="border border-border px-2 py-1.5 text-left font-medium">VENDEDOR/PROMOTOR</th>
              <th className="border border-border px-2 py-1.5 text-left font-medium w-[140px]">SUPORTE</th>
              <th className="border border-border px-2 py-1.5 text-left font-medium w-[140px]">COMERCIAL</th>
            </tr>
          </thead>
          <tbody>
            {generateData().map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                <td className="border border-border px-2 py-1 text-sm">{row.DATA}</td>
                <td className="border border-border px-2 py-1 text-sm">{row['DIA DA SEMANA']}</td>
                <td className="border border-border px-2 py-1 font-medium">{row['VENDEDOR/PROMOTOR']}</td>
                <td className="border border-border px-2 py-1">{row.SUPORTE}</td>
                <td className="border border-border px-2 py-1">{row.COMERCIAL}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
