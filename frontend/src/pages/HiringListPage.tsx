import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHiringForm } from '@/hooks/useHiringForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Clock, Plus, Eye, Trash2, AlertCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Hiring {
  _id: string;
  dadosPessoais: {
    nomeCompleto: string;
  };
  informacoesAdmissao: {
    cargo: string;
    statusAdmissao: string;
    motivoRejeicao?: string;
  };
  criadoEm: string;
  criadoPor: string;
}

export function HiringListPage() {
  const { user } = useAuth();
  const { loading, error: hookError, fetchHirings, approveHiring, rejectHiring, deleteHiring } = useHiringForm();
  const [hirings, setHirings] = useState<Hiring[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadHirings();
  }, [statusFilter]);

  const loadHirings = async () => {
    try {
      setError('');
      const filters = statusFilter ? { status: statusFilter, limit: 20, page: 1 } : { limit: 20, page: 1 };
      const data = await fetchHirings(filters);
      setHirings(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar fichas');
    }
  };

  const handleApprove = async (id: string, candidatoNome: string) => {
    if (!window.confirm(`Aprovar a contratação de ${candidatoNome}?`)) return;

    try {
      setLoadingAction(true);
      setError('');
      await approveHiring(id, user?.id || '', user?.role || '');
      setSuccess(`Contratação de ${candidatoNome} aprovada!`);
      await loadHirings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async (id: string, candidatoNome: string) => {
    const motivo = window.prompt(`Motivo da rejeição de ${candidatoNome}:`);
    if (!motivo) return;

    try {
      setLoadingAction(true);
      setError('');
      await rejectHiring(id, user?.id || '', user?.role || '', motivo);
      setSuccess(`Contratação de ${candidatoNome} rejeitada!`);
      await loadHirings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: string, candidatoNome: string) => {
    if (!window.confirm(`Deletar a ficha de ${candidatoNome}? Esta ação é irreversível.`)) return;

    try {
      setLoadingAction(true);
      setError('');
      await deleteHiring(id, user?.id || '', user?.role || '');
      setSuccess(`Ficha de ${candidatoNome} deletada!`);
      await loadHirings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovada':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Aprovada
          </Badge>
        );
      case 'Rejeitada':
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejeitada
          </Badge>
        );
      case 'Pendente Análise':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendente
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-800">Rascunho</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (!['admin', 'gerente'].includes(user?.role || '')) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Você não tem permissão para acessar esta página.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Voltar</span>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Fichas de Admissão</h1>
              <p className="text-muted-foreground mt-2">Gerencie e analise as contratações</p>
            </div>
          </div>
          <Link to="/contratacao">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Contratação
            </Button>
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('')}
            size="sm"
          >
            Todas
          </Button>
          <Button
            variant={statusFilter === 'Pendente Análise' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Pendente Análise')}
            size="sm"
          >
            Pendentes
          </Button>
          <Button
            variant={statusFilter === 'Aprovada' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Aprovada')}
            size="sm"
          >
            Aprovadas
          </Button>
          <Button
            variant={statusFilter === 'Rejeitada' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Rejeitada')}
            size="sm"
          >
            Rejeitadas
          </Button>
        </div>

        {/* Table */}
        <Card className="elevation-2">
          <CardHeader>
            <CardTitle>Contratações</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : hirings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma ficha encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-semibold text-foreground">Candidato</th>
                      <th className="text-left p-4 font-semibold text-foreground">Cargo</th>
                      <th className="text-left p-4 font-semibold text-foreground">Data</th>
                      <th className="text-left p-4 font-semibold text-foreground">Status</th>
                      <th className="text-right p-4 font-semibold text-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hirings.map((hiring) => (
                      <tr key={hiring._id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4 text-foreground">{hiring.dadosPessoais.nomeCompleto}</td>
                        <td className="p-4 text-foreground">{hiring.informacoesAdmissao.cargo}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(hiring.criadoEm)}</td>
                        <td className="p-4">{getStatusBadge(hiring.informacoesAdmissao.statusAdmissao)}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Link to={`/contratacao/${hiring._id}`}>
                              <Button size="sm" variant="outline" className="gap-2">
                                <Eye className="w-4 h-4" />
                                Ver
                              </Button>
                            </Link>

                            {hiring.informacoesAdmissao.statusAdmissao === 'Pendente Análise' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(hiring._id, hiring.dadosPessoais.nomeCompleto)}
                                  disabled={loadingAction}
                                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(hiring._id, hiring.dadosPessoais.nomeCompleto)}
                                  disabled={loadingAction}
                                  className="gap-2"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Rejeitar
                                </Button>
                              </>
                            )}

                            {['Em Preenchimento', 'Rejeitada'].includes(
                              hiring.informacoesAdmissao.statusAdmissao
                            ) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(hiring._id, hiring.dadosPessoais.nomeCompleto)}
                                disabled={loadingAction}
                                className="text-destructive hover:text-destructive gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HiringListPage;
