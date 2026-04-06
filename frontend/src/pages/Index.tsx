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
import { useEffect, useMemo } from 'react';

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

  return (
    <div className="min-h-screen bg-background">
      <AuthSync
        currentUserRole={currentUserRole}
        setCurrentUserRole={setCurrentUserRole}
        setSelectedSupervisor={setSelectedSupervisor}
      />
      {/* Page Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Sistema de Apontamento de Presença</h1>
            <p className="text-sm text-primary-foreground/80">Gestão de frequência de funcionários</p>
          </div>
          <div className="flex items-center gap-3">
            {(user?.role === 'admin' || user?.role === 'gerente') && (
              <Link
                to="/admin/usuarios"
                className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                Central de Usuários
              </Link>
            )}
            {(user?.role === 'admin' || user?.role === 'gerente') && (
              <Link
                to="/exportacao"
                className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                📊 Exportação
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link
                to="/admin/logs"
                className="text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                📋 Logs
              </Link>
            )}
            <div className="text-sm bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
              <span className="text-primary-foreground/70">Usuário:</span>{' '}
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
      <footer className="bg-muted border-t border-border py-4 px-6 mt-8">
        <div className="max-w-[1800px] mx-auto text-center text-sm text-muted-foreground">
          Sistema de Apontamento de Presença © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default Index;
