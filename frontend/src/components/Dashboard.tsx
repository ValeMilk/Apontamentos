import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, UserCog, FileBarChart2, ScrollText, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Decoração lateral com gradiente azul */}
      <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-[#0059A0]/90 to-[#004A85]/95 relative overflow-hidden items-center justify-center">
        {/* Elementos decorativos */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/15" />
          <div className="absolute top-1/3 right-10 w-48 h-48 rounded-full bg-white/10" />
        </div>
        
        <div className="relative z-10 text-center px-8">
          <img src="/logo-valemilk.png" alt="ValeMilk" className="w-56 mx-auto mb-8 drop-shadow-2xl" />
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Menu do Sistema</h1>
          <p className="text-white/80 text-sm font-normal leading-relaxed">
            Escolha uma das opções abaixo para continuar no sistema de apontamento
          </p>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="w-full lg:w-2/3 flex flex-col p-8 sm:p-12">
        {/* Header com logout */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl font-bold text-[#0059A0] tracking-tight">Bem-vindo!</h2>
            <p className="text-gray-600 mt-1 font-normal">
              {user?.name || 'Usuário'} • <span className="text-sm capitalize">{user?.role}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[#0059A0] hover:bg-[#0059A0]/5 rounded-lg transition-all font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        {/* Menu Principal */}
        <div className="flex-1">
          <div className="space-y-4 mb-12">
            {/* Apontamento Card */}
            <Link
              to="/apontamento"
              className="group block relative bg-gradient-to-br from-[#0059A0] to-[#004A85] rounded-2xl p-8 text-white hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/20 group-hover:bg-white/30 transition-all mb-4">
                    <ClipboardList className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 tracking-tight">Apontamento de Presença</h3>
                  <p className="text-white/90 text-sm font-normal leading-relaxed">
                    Gerencie frequência, faltas, atestados e justificativas
                  </p>
                </div>
                <div className="text-3xl group-hover:translate-x-2 transition-transform ml-4 flex-shrink-0">→</div>
              </div>
            </Link>

            {/* Contratações Card */}
            {(user?.role === 'admin' || user?.role === 'gerente' || user?.role === 'supervisor') && (
              <Link
                to={user?.role === 'supervisor' ? '/contratacao' : '/contratacoes'}
                className="group block relative bg-gradient-to-br from-[#0059A0]/80 to-[#004A85]/80 rounded-2xl p-8 text-white hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden border-2 border-[#0059A0]/50"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/20 group-hover:bg-white/30 transition-all mb-4">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 tracking-tight">
                      {user?.role === 'supervisor' ? 'Nova Contratação' : 'Fichas de Admissão'}
                    </h3>
                    <p className="text-white/90 text-sm font-normal leading-relaxed">
                      {user?.role === 'supervisor'
                        ? 'Preencha fichas para novos contratados'
                        : 'Analise, aprove e rejeite fichas'}
                    </p>
                  </div>
                  <div className="text-3xl group-hover:translate-x-2 transition-transform ml-4 flex-shrink-0">→</div>
                </div>
              </Link>
            )}
          </div>

          {/* Ferramentas Administrativas */}
          {(user?.role === 'admin' || user?.role === 'gerente') && (
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Ferramentas Administrativas</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <Link
                  to="/admin/usuarios"
                  className="group flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-[#0059A0] hover:bg-[#0059A0]/5 transition-all"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0059A0]/10 flex items-center justify-center group-hover:bg-[#0059A0]/20 transition-all">
                    <UserCog className="w-5 h-5 text-[#0059A0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Usuários</p>
                    <p className="text-xs text-gray-600">Gerenciar acesso</p>
                  </div>
                </Link>

                <Link
                  to="/exportacao"
                  className="group flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-[#0059A0] hover:bg-[#0059A0]/5 transition-all"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0059A0]/10 flex items-center justify-center group-hover:bg-[#0059A0]/20 transition-all">
                    <FileBarChart2 className="w-5 h-5 text-[#0059A0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Exportação</p>
                    <p className="text-xs text-gray-600">Relatórios e dados</p>
                  </div>
                </Link>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin/logs"
                    className="group flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-[#0059A0] hover:bg-[#0059A0]/5 transition-all"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0059A0]/10 flex items-center justify-center group-hover:bg-[#0059A0]/20 transition-all">
                      <ScrollText className="w-5 h-5 text-[#0059A0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">Auditoria</p>
                      <p className="text-xs text-gray-600">Logs de atividade</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 font-normal mt-auto pt-8 border-t border-gray-200">
          © 2026 ValeMilk — Todos os direitos reservados
        </div>
      </div>
    </div>
  );
}
