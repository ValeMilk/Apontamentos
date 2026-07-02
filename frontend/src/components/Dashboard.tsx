import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, UserCog, FileBarChart2, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-2">Bem-vindo ao Sistema</h1>
          <p className="text-lg text-muted-foreground">
            Olá, <span className="font-semibold">{user?.name || 'Usuário'}</span>! Escolha uma opção para continuar
          </p>
        </div>

        {/* Main Menu Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Apontamento Card */}
          <Link
            to="/apontamento"
            className="group relative bg-card border-2 border-border rounded-2xl p-8 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Apontamento de Presença</h2>
              <p className="text-muted-foreground mb-6">
                Gerencie a frequência, faltas, atestados e justificativas dos funcionários
              </p>
              <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                Ir para Apontamento
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Button>
            </div>
          </Link>

          {/* Contratações Card */}
          {(user?.role === 'admin' || user?.role === 'gerente' || user?.role === 'supervisor') && (
            <Link
              to={user?.role === 'supervisor' ? '/contratacao' : '/contratacoes'}
              className="group relative bg-card border-2 border-border rounded-2xl p-8 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {user?.role === 'supervisor' ? 'Nova Contratação' : 'Fichas de Admissão'}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {user?.role === 'supervisor'
                    ? 'Preencha fichas de admissional para novos contratados'
                    : 'Analise, aprove e rejeite fichas de admissional'}
                </p>
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  {user?.role === 'supervisor' ? 'Criar Contratação' : 'Gerenciar Contratações'}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Button>
              </div>
            </Link>
          )}
        </div>

        {/* Admin Tools (optional) */}
        {(user?.role === 'admin' || user?.role === 'gerente') && (
          <div className="mt-16">
            <h3 className="text-lg font-semibold text-foreground mb-6">Ferramentas Administrativas</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Link
                to="/admin/usuarios"
                className="group flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
              >
                <UserCog className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Usuários</p>
                  <p className="text-xs text-muted-foreground">Gerenciar acesso</p>
                </div>
              </Link>

              <Link
                to="/exportacao"
                className="group flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
              >
                <FileBarChart2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Exportação</p>
                  <p className="text-xs text-muted-foreground">Relatórios e dados</p>
                </div>
              </Link>

              {user?.role === 'admin' && (
                <Link
                  to="/admin/logs"
                  className="group flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <ScrollText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Auditoria</p>
                    <p className="text-xs text-muted-foreground">Logs de atividade</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
