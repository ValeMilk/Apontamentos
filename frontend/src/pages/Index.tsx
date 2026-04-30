import { useAttendance, usePersistCurrentDate } from '@/hooks/useAttendance';
import { useMonthStatus } from '@/hooks/useMonthStatus';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Login } from '@/components/Login';
import { HeaderControls } from '@/components/HeaderControls';
import { Link } from 'react-router-dom';
import { AttendanceTable } from '@/components/AttendanceTable';
import { JustificationsSection } from '@/components/JustificationsSection';
import { AtestadosSection } from '@/components/AtestadosSection';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useMemo, useState, useRef } from 'react';
import { ClipboardList, UserCog, FileBarChart2, ScrollText, UserCircle2, Check, Loader2, CloudOff } from 'lucide-react';
import { toast } from 'sonner';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function AutoSaveStatus({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/80">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Salvando...
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-200">
        <CloudOff className="w-3.5 h-3.5" />
        Falha ao salvar
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/80">
        <Check className="w-3.5 h-3.5" />
        Salvo automaticamente
      </span>
    );
  }
  return null;
}

// AuthSync extracted outside Index to prevent re-mounting on every render
function AuthSync({
  currentUserRole,
  setCurrentUserRole,
  setSelectedSupervisor,
}: {
  currentUserRole: string;
  setCurrentUserRole: (role: 'admin' | 'gerente' | 'supervisor' | 'expectador') => void;
  setSelectedSupervisor: (id: string) => void;
}) {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      if (currentUserRole !== user.role) {
        setCurrentUserRole(user.role as 'admin' | 'gerente' | 'supervisor' | 'expectador');
      }
      if (user.role === 'supervisor' || user.role === 'gerente') {
        const supId = (user as any).id || (user as any).supervisorId || 'all';
        setSelectedSupervisor(supId);
      }
    } else {
      setCurrentUserRole('expectador');
    }
  }, [user, currentUserRole]);
  return null;
}

const Index = () => {
  const { accessToken, user } = useAuth();
  const {
    currentDate,
    setCurrentDate,
    selectedSupervisor,
    setSelectedSupervisor,
    currentUserRole,
    setCurrentUserRole,
    justifications,
    daysInMonth,
    filteredEmployees,
    currentSupervisor,
    supervisors,
    getRecord,
    updateRecord,
    updateRecordsBatch,
    clearAll,
    addJustification,
    removeJustification,
    getTotals,
    getEmployeeFaltas,
    saveAll,
    refreshData,
    hasUnsavedChanges,
  } = useAttendance();

  // Extract month in YYYY-MM format from currentDate
  const currentMonth = format(currentDate, 'yyyy-MM');
  const { isLocked: isMonthLocked, unlockMonth, lockMonth, monthLockLoading } = useMonthStatus(currentMonth, accessToken);

  // persist currentDate so page reload keeps the current period
  usePersistCurrentDate(currentDate);

  // Auto-select first supervisor when switching to supervisor/expectador role
  useEffect(() => {
    if ((currentUserRole === 'supervisor' || currentUserRole === 'gerente' || currentUserRole === 'expectador') && selectedSupervisor === 'all') {
      setSelectedSupervisor(supervisors[0]?.id || 'all');
    }
  }, [currentUserRole, selectedSupervisor, supervisors, setSelectedSupervisor]);

  // período vigente: 26 deste mês → 25 do próximo
  const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 26);
  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 25);
  // Referência de nome é sempre o dia 25 (data mais tardia)
  const periodLabel = format(periodEnd, 'MMMM yyyy', { locale: ptBR }).toUpperCase();

  // Memoize the filtered justifications to avoid recomputing the regex and lookups on every render
  const filteredJustifications = useMemo(() => {
    const employeeIds = new Set(filteredEmployees.map(e => e.id));
    const periodDays = new Set(daysInMonth.map(d => d.day));
    const autoGenRegex = /^[\w-]+\s*[—–-]\s*\d{2}\/\d{2}\/\d{4}$/;
    return justifications.filter(j => {
      if (!employeeIds.has(j.employeeId)) return false;
      const text = (j.text || '').trim();
      if (text.length === 0 || autoGenRegex.test(text)) return false;
      if (!periodDays.has(j.day)) return false;
      return true;
    });
  }, [justifications, filteredEmployees, daysInMonth]);

  // Atestados: filtered only by employee/period presence of attestFile (no text filter)
  const filteredAtestados = useMemo(() => {
    const employeeIds = new Set(filteredEmployees.map(e => e.id));
    const periodDays = new Set(daysInMonth.map(d => d.day));
    return justifications.filter(j =>
      j.attestFile && employeeIds.has(j.employeeId) && periodDays.has(j.day)
    );
  }, [justifications, filteredEmployees, daysInMonth]);

  // Atestados pendentes: c\u00e9lulas marcadas como AT sem arquivo anexado
  const pendingAtKeys = useMemo(() => {
    const withFile = new Set(
      justifications
        .filter(j => !!j.attestFile)
        .map(j => `${j.employeeId}|${j.day}`)
    );
    const set = new Set<string>();
    for (const emp of filteredEmployees) {
      for (const dayInfo of daysInMonth) {
        const key = `${emp.id}|${dayInfo.day}`;
        if (withFile.has(key)) continue;
        const record = getRecord(emp.id, dayInfo.day);
        if (record.supervisor === 'AT') set.add(key);
      }
    }
    return set;
  }, [justifications, filteredEmployees, daysInMonth, getRecord]);

  // Autosave: salva automaticamente após pequeno debounce quando houver alterações
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const savedTimeoutRef = useRef<number | null>(null);
  // Mantemos saveAll em ref para o effect de autosave NÃO ser reagendado a cada
  // mudança de records (saveAll muda de referência sempre que records muda).
  const saveAllRef = useRef(saveAll);
  useEffect(() => {
    saveAllRef.current = saveAll;
  }, [saveAll]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (currentUserRole === 'expectador') return;
    if (isMonthLocked) return;
    const t = window.setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const ok = await saveAllRef.current();
        if (ok) {
          setSaveStatus('saved');
          if (savedTimeoutRef.current) window.clearTimeout(savedTimeoutRef.current);
          savedTimeoutRef.current = window.setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
          toast.error('Falha ao salvar automaticamente');
        }
      } catch (e) {
        console.error('[autosave] error', e);
        setSaveStatus('error');
        toast.error('Erro ao salvar automaticamente');
      }
    }, 1000);
    return () => window.clearTimeout(t);
  }, [hasUnsavedChanges, currentUserRole, isMonthLocked]);

  return (
    <div className="min-h-screen bg-background">
      <AuthSync
        currentUserRole={currentUserRole}
        setCurrentUserRole={setCurrentUserRole}
        setSelectedSupervisor={setSelectedSupervisor}
      />
      {/* Page Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/10 rounded-lg p-2">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sistema de Apontamento de Presença</h1>
              <p className="text-sm text-primary-foreground/80">Gestão de frequência de funcionários</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(user?.role === 'admin' || user?.role === 'gerente') && (
              <Link
                to="/admin/usuarios"
                className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium inline-flex items-center gap-1.5"
              >
                <UserCog className="w-4 h-4" />
                Usuários
              </Link>
            )}
            {(user?.role === 'admin' || user?.role === 'gerente') && (
              <Link
                to="/exportacao"
                className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium inline-flex items-center gap-1.5"
              >
                <FileBarChart2 className="w-4 h-4" />
                Exportação
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link
                to="/admin/logs"
                className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium inline-flex items-center gap-1.5"
              >
                <ScrollText className="w-4 h-4" />
                Logs
              </Link>
            )}
            {currentUserRole !== 'expectador' && !isMonthLocked && (
              <AutoSaveStatus status={saveStatus} />
            )}
            <div className="text-sm bg-primary-foreground/15 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <UserCircle2 className="w-4 h-4 text-primary-foreground/80" />
              <span className="font-semibold">
                {currentUserRole === 'admin' ? 'Administrador' : currentUserRole === 'gerente' ? 'Gerente' : currentUserRole === 'expectador' ? 'Expectador' : currentSupervisor?.name || 'Supervisor'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <HeaderControls
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          selectedSupervisor={selectedSupervisor}
          onSupervisorChange={setSelectedSupervisor}
          supervisors={supervisors}
          currentUserRole={currentUserRole}
          onRoleChange={setCurrentUserRole}
          onClearAll={clearAll}
          onRefresh={refreshData}
          isMonthLocked={isMonthLocked}
          onToggleMonthLock={async (unlock: boolean) => {
            return unlock ? await unlockMonth() : await lockMonth();
          }}
          monthLockLoading={monthLockLoading}
        />

        <AttendanceTable
          employees={filteredEmployees}
          daysInMonth={daysInMonth}
          getRecord={getRecord}
          updateRecord={updateRecord}
          updateRecordsBatch={updateRecordsBatch}
          addJustification={addJustification}
          getTotals={getTotals}
          currentUserRole={currentUserRole}
          supervisorName={currentSupervisor?.name}
          storeName={currentSupervisor?.store}
          periodLabel={periodLabel}
          onSave={saveAll}
          isMonthLocked={isMonthLocked}
          pendingAtKeys={pendingAtKeys}
        />

        <JustificationsSection
          justifications={filteredJustifications}
          employees={filteredEmployees}
          daysInMonth={daysInMonth}
          onAdd={addJustification}
          onRemove={removeJustification}
          currentUserRole={currentUserRole}
        />

        <AtestadosSection
          justifications={filteredAtestados}
          employees={filteredEmployees}
        />

        {/* If not authenticated, show login */}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 px-6 mt-8">
        <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span>Sistema de Apontamento de Presença</span>
          </div>
          <span className="text-xs">© {new Date().getFullYear()} — Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
