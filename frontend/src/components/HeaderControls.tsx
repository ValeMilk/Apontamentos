import { useState } from 'react';
import { format, addMonths, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Supervisor } from '@/types/attendance';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  RefreshCw,
  LogOut,
  Lock,
  Unlock,
  Calendar,
  Eye,
  X,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';

interface HeaderControlsProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedSupervisor: string | 'all';
  onSupervisorChange: (value: string | 'all') => void;
  supervisors: Supervisor[];
  currentUserRole: 'admin' | 'gerente' | 'supervisor' | 'expectador';
  onRoleChange: (role: 'admin' | 'gerente' | 'supervisor' | 'expectador') => void;
  onClearAll: () => void;
  onRefresh?: () => void;
  isMonthLocked?: boolean;
  onToggleMonthLock?: (unlock: boolean) => Promise<boolean>;
  monthLockLoading?: boolean;
}

const ROLE_CONFIG: Record<
  'admin' | 'gerente' | 'supervisor' | 'expectador',
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  admin: { label: 'Admin', icon: Shield },
  gerente: { label: 'Gerente', icon: Users },
  supervisor: { label: 'Supervisor', icon: Users },
  expectador: { label: 'Expectador', icon: Eye },
};

export function HeaderControls({
  currentDate,
  onDateChange,
  selectedSupervisor,
  onSupervisorChange,
  supervisors,
  currentUserRole,
  onRoleChange,
  onRefresh,
  isMonthLocked = true,
  onToggleMonthLock,
  monthLockLoading = false,
}: HeaderControlsProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const periodEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 25);
  const monthLabel = format(periodEndDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
  const [showPeriodSidebar, setShowPeriodSidebar] = useState(false);
  const isRoleLocked = !!user;

  function getPeriodRange(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 26);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 25);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    days.sort((a, b) => a.getTime() - b.getTime());
    return { start, end, days };
  }

  const period = getPeriodRange(currentDate);
  const WEEKDAY_ABBR_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const periodRangeLabel = `${format(period.start, 'dd/MM')} → ${format(period.end, 'dd/MM')}`;

  const canGoToPrevious =
    currentDate.getFullYear() > 2026 ||
    (currentDate.getFullYear() === 2026 && currentDate.getMonth() > 0);
  const canGoToNext =
    currentDate.getFullYear() < 2026 ||
    (currentDate.getFullYear() === 2026 && currentDate.getMonth() < 11);

  const roles: ('admin' | 'gerente' | 'supervisor' | 'expectador')[] = [
    'admin',
    'gerente',
    'supervisor',
    'expectador',
  ];

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm mb-6">
      {/* Linha 1: Período + Ações principais */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDateChange(subMonths(currentDate, 1))}
                  disabled={!canGoToPrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mês anterior</TooltipContent>
            </Tooltip>

            <div className="px-4 text-center min-w-[180px]">
              <div className="font-bold text-base text-primary leading-tight">{monthLabel}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{periodRangeLabel}</div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDateChange(addMonths(currentDate, 1))}
                  disabled={!canGoToNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Próximo mês</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPeriodSidebar((v) => !v)}
                className="gap-1.5"
              >
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Ver dias</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver todos os dias do período</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUserRole === 'admin' && onToggleMonthLock && (
            <Button
              variant={isMonthLocked ? 'destructive' : 'default'}
              size="sm"
              onClick={async () => {
                const success = await onToggleMonthLock(isMonthLocked);
                if (success) {
                  const action = isMonthLocked ? 'liberado' : 'bloqueado';
                  toast.success(`Período ${action} com sucesso`);
                } else {
                  toast.error('Não foi possível alterar o status do período');
                }
              }}
              disabled={monthLockLoading}
              className="gap-2"
            >
              {monthLockLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isMonthLocked ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {isMonthLocked ? 'Liberar Período' : 'Bloquear Período'}
            </Button>
          )}
          {isMonthLocked && currentUserRole !== 'admin' && (
            <Badge variant="destructive" className="gap-1.5 text-xs">
              <Lock className="w-3 h-3" />
              Período Bloqueado
            </Badge>
          )}
          {onRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onRefresh();
                    toast.success('Dados atualizados');
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Recarregar dados do servidor</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Encerrar sessão</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Linha 2: Visão + Equipe */}
      <div className="flex flex-wrap items-center gap-4 p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Visão:
          </span>
          <div className="flex gap-1 bg-background rounded-lg p-1 border border-border">
            {roles.map((role) => {
              const cfg = ROLE_CONFIG[role];
              const Icon = cfg.icon;
              const isActive = currentUserRole === role;
              const isDisabled = isRoleLocked && user?.role !== role;
              return (
                <Button
                  key={role}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onRoleChange(role)}
                  disabled={isDisabled}
                  className="gap-1.5 h-8"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{cfg.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Equipe:
          </span>
          <Select
            value={selectedSupervisor}
            onValueChange={onSupervisorChange}
            disabled={currentUserRole === 'supervisor' && selectedSupervisor !== 'all'}
          >
            <SelectTrigger className="max-w-[280px] h-9">
              <SelectValue placeholder="Selecione equipe..." />
            </SelectTrigger>
            <SelectContent>
              {currentUserRole === 'admin' && <SelectItem value="all">Todas as equipes</SelectItem>}
              {supervisors.map((sup) => (
                <SelectItem key={sup.id} value={sup.id}>
                  {sup.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Linha 3: Legenda */}
      <div className="px-4 py-3 bg-muted/10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wide">
            Legenda:
          </span>
          {[
            { cls: 'cell-present', code: 'P', label: 'Presente' },
            { cls: 'cell-absent', code: 'F', label: 'Falta' },
            { cls: 'cell-falta-tarde', code: 'FT', label: 'Falta Tarde' },
            { cls: 'cell-falta-manha', code: 'FM', label: 'Falta Manhã' },
            { cls: 'cell-atestado', code: 'AT', label: 'Atestado' },
            { cls: 'cell-abono-falta', code: 'ABF', label: 'Abono Falta' },
            { cls: 'cell-abono-trab', code: 'ABT', label: 'Abono Trab.' },
            { cls: 'cell-sunday', code: 'D', label: 'Domingo' },
            { cls: 'cell-holiday', code: 'F', label: 'Feriado' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className={`min-w-[28px] h-5 px-1 rounded ${item.cls} flex items-center justify-center text-[10px]`}
              >
                {item.code}
              </span>
              <span className="text-foreground/80">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar de período */}
      {showPeriodSidebar && (
        <div
          className="fixed left-4 top-24 z-50 w-72 rounded-lg border border-border bg-card p-4 shadow-2xl"
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-primary">Período do Mês</div>
              <div className="text-xs text-muted-foreground">
                {format(period.start, "dd 'de' MMM", { locale: ptBR })} →{' '}
                {format(period.end, "dd 'de' MMM", { locale: ptBR })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowPeriodSidebar(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ul className="space-y-1">
            {period.days.map((d) => {
              const isSunday = d.getDay() === 0;
              return (
                <li
                  key={d.toISOString()}
                  className={`flex items-center justify-between text-[13px] px-2 py-1 rounded ${
                    isSunday ? 'bg-muted/60 text-muted-foreground' : 'hover:bg-muted/40'
                  }`}
                >
                  <span className="font-medium">{format(d, 'dd/MM')}</span>
                  <span className="text-xs text-muted-foreground">{WEEKDAY_ABBR_PT[d.getDay()]}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
