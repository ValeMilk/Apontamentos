import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/context/AuthContext';
import { DataExport } from '@/components/DataExport';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ExportPage = () => {
  const { user } = useAuth();
  const {
    daysInMonth,
    filteredEmployees,
    supervisors,
    getRecord,
    currentDate,
    justifications,
  } = useAttendance();

  const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 25);
  const periodLabel = format(periodEnd, 'MMMM yyyy', { locale: ptBR }).toUpperCase();

  if (user?.role !== 'admin' && user?.role !== 'gerente') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta página.</p>
          <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Exportação de Dados</h1>
              <p className="text-sm text-primary-foreground/80">Base de dados para exportação CSV</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <DataExport
          employees={filteredEmployees}
          daysInMonth={daysInMonth}
          getRecord={getRecord}
          periodLabel={periodLabel}
          supervisors={supervisors}
          justifications={justifications}
        />
      </main>
    </div>
  );
};

export default ExportPage;
