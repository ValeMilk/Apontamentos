import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Supervisor } from '@/types/attendance';
import { ChevronLeft, ChevronRight, Trash2, Users, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HeaderControlsProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedSupervisor: string | 'all';
  onSupervisorChange: (value: string | 'all') => void;
  supervisors: Supervisor[];
  currentUserRole: 'admin' | 'supervisor';
  onRoleChange: (role: 'admin' | 'supervisor') => void;
  onClearAll: () => void;
}

export function HeaderControls({
  currentDate,
  onDateChange,
  selectedSupervisor,
  onSupervisorChange,
  supervisors,
  currentUserRole,
  onRoleChange,
  onClearAll,
}: HeaderControlsProps) {
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Role Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Visão:</span>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={currentUserRole === 'admin' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onRoleChange('admin')}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin (Apontador)
            </Button>
            <Button
              variant={currentUserRole === 'supervisor' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onRoleChange('supervisor')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Supervisor
            </Button>
          </div>
        </div>

        {/* Supervisor Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Equipe:</span>
          <Select 
            value={selectedSupervisor} 
            onValueChange={onSupervisorChange}
            disabled={currentUserRole === 'supervisor' && selectedSupervisor !== 'all'}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione equipe..." />
            </SelectTrigger>
            <SelectContent>
              {currentUserRole === 'admin' && (
                <SelectItem value="all">Todas as equipes</SelectItem>
              )}
              {supervisors.map(sup => (
                <SelectItem key={sup.id} value={sup.id}>
                  {sup.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-[150px] text-center font-semibold text-primary">
            {monthLabel}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Clear Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Limpar Tudo / Novo Mês
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá apagar todos os apontamentos e justificativas do mês atual. 
                Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onClearAll}>
                Confirmar Limpeza
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="font-medium text-muted-foreground">Legenda:</span>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-present flex items-center justify-center text-[10px]">P</span>
            <span>Presente</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-absent flex items-center justify-center text-[10px]">F</span>
            <span>Falta</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-partial flex items-center justify-center text-[10px]">FT</span>
            <span>Falta Tarde</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-partial flex items-center justify-center text-[10px]">FM</span>
            <span>Falta Manhã</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-justified flex items-center justify-center text-[10px]">AT</span>
            <span>Atestado</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-justified flex items-center justify-center text-[10px]">ABF</span>
            <span>Abono Falta</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-justified flex items-center justify-center text-[10px]">ABT</span>
            <span>Abono Trab.</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-sunday flex items-center justify-center text-[10px]">D</span>
            <span>Domingo</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded cell-holiday flex items-center justify-center text-[10px]">F</span>
            <span>Feriado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
