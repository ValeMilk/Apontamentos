import { useState } from 'react';
import { Justification, Employee, DayInfo } from '@/types/attendance';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Paperclip, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface JustificationsSectionProps {
  justifications: Justification[];
  employees: Employee[];
  daysInMonth: DayInfo[];
  onAdd: (employeeId: string, day: string, text: string, applyToSupervisor?: boolean, supervisorCode?: string) => void;
  onRemove: (id: string) => void;
  currentUserRole?: 'admin' | 'gerente' | 'supervisor' | 'expectador';
}

export function JustificationsSection({
  justifications,
  employees,
  daysInMonth,
  onAdd,
  onRemove,
  currentUserRole = 'admin',
}: JustificationsSectionProps) {
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newDay, setNewDay] = useState('');
  const [newText, setNewText] = useState('');
  const [applyToSupervisor, setApplyToSupervisor] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState('AT');

  const handleAdd = () => {
    if (currentUserRole === 'expectador') return;
    if (!newEmployeeId || !newDay || !newText.trim()) {
      toast.error('Preencha funcionário, dia e justificativa');
      return;
    }
    const willApply = applyToSupervisor;
    onAdd(newEmployeeId, newDay, newText.trim(), willApply, willApply ? (supervisorCode as any) : undefined);
    toast.success('Justificativa adicionada');
    setNewEmployeeId('');
    setNewDay('');
    setNewText('');
    setApplyToSupervisor(false);
    setSupervisorCode('AT');
  };

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'Desconhecido';
  };

  return (
    <div className="mt-8 border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="table-header-cell px-4 py-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        <h3 className="font-semibold text-sm">JUSTIFICATIVA DA FALTA ABONADA</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Formulário de nova justificativa */}
        {currentUserRole !== 'expectador' && (
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Funcionário</label>
              <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[100px]">
              <label className="text-xs text-muted-foreground mb-1 block">Dia</label>
              <Select value={newDay} onValueChange={setNewDay}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  {daysInMonth.map(d => (
                    <SelectItem key={d.day} value={d.day}>
                      {format(d.date, 'd')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-[2] min-w-[300px]">
              <label className="text-xs text-muted-foreground mb-1 block">Justificativa</label>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Digite a justificativa..."
                className="h-9"
              />
            </div>

            <div className="w-[240px]">
              <label className="text-xs text-muted-foreground mb-1 block">Aplicar ao supervisor?</label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={applyToSupervisor}
                  onChange={(e) => setApplyToSupervisor(e.target.checked)}
                  className="w-4 h-4"
                />
                <select
                  value={supervisorCode}
                  onChange={(e) => setSupervisorCode(e.target.value)}
                  className="h-9 rounded border px-2 text-sm flex-1"
                  disabled={!applyToSupervisor}
                >
                  <option value="AT">AT — ATESTADO</option>
                  <option value="ABF">ABF — ABONO FALTA</option>
                  <option value="ABT">ABT — ABONO TRAB</option>
                </select>
              </div>
            </div>

            <Button onClick={handleAdd} size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        )}

        {/* Lista de justificativas */}
        {justifications.length > 0 ? (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[250px]">FUNCIONÁRIO</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-[80px]">DIA</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">JUSTIFICATIVA DA FALTA ABONADA</th>
                  <th className="w-[40px]"></th>
                  <th className="w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {justifications.map((just, index) => (
                  <tr key={just.id} className={index % 2 === 1 ? 'bg-muted/50' : ''}>
                    <td className="px-3 py-2 font-medium uppercase">{getEmployeeName(just.employeeId)}</td>
                    <td className="px-3 py-2 text-center">{just.day}</td>
                    <td className="px-3 py-2">{just.text}</td>
                    <td className="px-2 py-2 text-center">
                      {just.attestFile && (
                        <a
                          href={`/uploads/${just.attestFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver atestado"
                          className="inline-flex items-center justify-center text-emerald-700 hover:text-emerald-900"
                        >
                          <Paperclip className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {currentUserRole !== 'expectador' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm('Remover esta justificativa?')) {
                              onRemove(just.id);
                              toast.success('Justificativa removida');
                            }
                          }}
                          className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 opacity-30" />
            Nenhuma justificativa cadastrada
          </p>
        )}
      </div>
    </div>
  );
}
