import { useAttendance } from '@/hooks/useAttendance';
import { HeaderControls } from '@/components/HeaderControls';
import { AttendanceTable } from '@/components/AttendanceTable';
import { JustificationsSection } from '@/components/JustificationsSection';
import { DataExport } from '@/components/DataExport';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';

const Index = () => {
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
    clearAll,
    addJustification,
    removeJustification,
    getTotals,
  } = useAttendance();

  // Auto-select first supervisor when switching to supervisor role
  useEffect(() => {
    if (currentUserRole === 'supervisor' && selectedSupervisor === 'all') {
      setSelectedSupervisor(supervisors[0]?.id || 'all');
    }
  }, [currentUserRole, selectedSupervisor, supervisors, setSelectedSupervisor]);

  const periodLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Sistema de Apontamento de Presença</h1>
            <p className="text-sm text-primary-foreground/80">Gestão de frequência de funcionários</p>
          </div>
          <div className="flex items-center gap-2 text-sm bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
            <span className="text-primary-foreground/70">Usuário:</span>
            <span className="font-semibold">
              {currentUserRole === 'admin' ? 'Administrador' : currentSupervisor?.name || 'Supervisor'}
            </span>
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
        />

        <AttendanceTable
          employees={filteredEmployees}
          daysInMonth={daysInMonth}
          getRecord={getRecord}
          updateRecord={updateRecord}
          getTotals={getTotals}
          isAdmin={currentUserRole === 'admin'}
          supervisorName={currentSupervisor?.name}
          storeName={currentSupervisor?.store}
          periodLabel={periodLabel}
        />

        <JustificationsSection
          justifications={justifications.filter(j => 
            filteredEmployees.some(e => e.id === j.employeeId)
          )}
          employees={filteredEmployees}
          daysInMonth={daysInMonth.length}
          onAdd={addJustification}
          onRemove={removeJustification}
        />

        <DataExport
          employees={filteredEmployees}
          daysInMonth={daysInMonth}
          getRecord={getRecord}
          periodLabel={periodLabel}
        />
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
