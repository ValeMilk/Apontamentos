import { useState } from 'react';
import { Justification, Employee } from '@/types/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

interface JustificationsSectionProps {
  justifications: Justification[];
  employees: Employee[];
  daysInMonth: number;
  onAdd: (employeeId: string, day: number, text: string) => void;
  onRemove: (id: string) => void;
}

export function JustificationsSection({
  justifications,
  employees,
  daysInMonth,
  onAdd,
  onRemove,
}: JustificationsSectionProps) {
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newDay, setNewDay] = useState('');
  const [newText, setNewText] = useState('');

  const handleAdd = () => {
    if (newEmployeeId && newDay && newText.trim()) {
      onAdd(newEmployeeId, parseInt(newDay), newText.trim());
      setNewEmployeeId('');
      setNewDay('');
      setNewText('');
    }
  };

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'Desconhecido';
  };

  return (
    <div className="mt-8 border border-border rounded-lg overflow-hidden">
      <div className="table-header-cell px-4 py-3">
        <h3 className="font-semibold text-sm">JUSTIFICATIVA DA FALTA ABONADA</h3>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Add new justification */}
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
                    {emp.name}
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
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1}
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
          
          <Button onClick={handleAdd} size="sm" className="h-9">
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Justifications list */}
        {justifications.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[250px]">FUNCIONÁRIO</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-[80px]">DIA</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">JUSTIFICATIVA DA FALTA ABONADA</th>
                  <th className="w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {justifications.map((just, index) => (
                  <tr key={just.id} className={index % 2 === 1 ? 'bg-muted/50' : ''}>
                    <td className="px-3 py-2 font-medium">{getEmployeeName(just.employeeId)}</td>
                    <td className="px-3 py-2 text-center">{just.day}</td>
                    <td className="px-3 py-2">{just.text}</td>
                    <td className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(just.id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {justifications.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">
            Nenhuma justificativa cadastrada
          </p>
        )}
      </div>
    </div>
  );
}
