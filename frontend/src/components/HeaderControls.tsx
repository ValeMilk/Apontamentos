import { useState } from 'react';
import { format, addMonths, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Supervisor } from '@/types/attendance';
import { ChevronLeft, ChevronRight, Users, Shield } from 'lucide-react';

interface HeaderControlsProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedSupervisor: string | 'all';
  onSupervisorChange: (value: string | 'all') => void;
  supervisors: Supervisor[];
  currentUserRole: 'admin' | 'supervisor' | 'expectador';
  onRoleChange: (role: 'admin' | 'supervisor' | 'expectador') => void;
  onClearAll: () => void;
  onRefresh?: () => void;
  isMonthLocked?: boolean;
  onToggleMonthLock?: (unlock: boolean) => Promise<boolean>;
  monthLockLoading?: boolean;
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
  onRefresh,
  isMonthLocked = true,
  onToggleMonthLock,
  monthLockLoading = false,
}: HeaderControlsProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
  const [showPeriodSidebar, setShowPeriodSidebar] = useState(false);
  const isRoleLocked = !!user;

  function getPeriodRange(date: Date) {
    // período de 26 deste mês até 25 do próximo mês
    const start = new Date(date.getFullYear(), date.getMonth(), 26);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 25);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    // garantir ordenação por timestamp (asc)
    days.sort((a, b) => a.getTime() - b.getTime());
    return { start, end, days };
  }

  const period = getPeriodRange(currentDate);
  const WEEKDAY_ABBR_PT = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
  
  // Restrict navigation to 2026 only
  const canGoToPrevious = currentDate.getFullYear() > 2026 || (currentDate.getFullYear() === 2026 && currentDate.getMonth() > 0);
  const canGoToNext = currentDate.getFullYear() < 2026 || (currentDate.getFullYear() === 2026 && currentDate.getMonth() < 11);

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
              disabled={isRoleLocked && user?.role !== 'admin'}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin (Apontador)
            </Button>
            <Button
              variant={currentUserRole === 'supervisor' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onRoleChange('supervisor')}
              disabled={isRoleLocked && user?.role !== 'supervisor'}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Supervisor
            </Button>
            <Button
              variant={currentUserRole === 'expectador' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onRoleChange('expectador')}
              disabled={isRoleLocked && user?.role !== 'expectador'}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Expectador
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
            disabled={!canGoToPrevious}
            title={!canGoToPrevious ? "Não é possível voltar para 2025" : undefined}
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
            disabled={!canGoToNext}
            title={!canGoToNext ? "Não é possível avançar além de 2026" : undefined}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setShowPeriodSidebar((v: boolean) => !v)} className="ml-2">
            Ver Período 26→25
          </Button>
        </div>

        {/* ações de limpar e avançar foram removidas — navegue com as setas */}
        <div className="flex items-center gap-2">
          {currentUserRole === 'admin' && onToggleMonthLock && (
            <Button
              variant={isMonthLocked ? 'destructive' : 'default'}
              size="sm"
              onClick={async () => {
                const success = await onToggleMonthLock(isMonthLocked);
                if (success) {
                  const action = isMonthLocked ? 'liberado' : 'bloqueado';
                  alert(`Mês ${action} com sucesso!`);
                }
              }}
              disabled={monthLockLoading}
            >
              {monthLockLoading ? '...' : isMonthLocked ? '🔒 Liberar Mês' : '🔓 Bloquear Mês'}
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              Atualizar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sair
          </Button>
        </div>
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
      {showPeriodSidebar && (
        <div className="fixed left-4 top-24 z-50 w-64 rounded border bg-card p-3 shadow-lg" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Período: {format(period.start, 'dd/MM')} — {format(period.end, 'dd/MM')}</div>
            <button className="text-sm text-muted-foreground" onClick={() => setShowPeriodSidebar(false)}>Fechar</button>
          </div>
          <div className="text-xs text-muted-foreground mb-2">Visualização do mês customizado (26 → 25)</div>
          <ul className="space-y-1">
            {period.days.map((d) => (
              <li key={d.toISOString()} className="flex items-center justify-between text-[13px]">
                <div>{format(d, 'dd/MM')} — {WEEKDAY_ABBR_PT[d.getDay()]}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
