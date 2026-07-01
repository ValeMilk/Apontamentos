# 🚀 Integração da Tela de Contratação

## ✅ O que foi criado

### 1. **Backend**
- ✅ Model Mongoose: `backend/src/models/Hiring.ts`
  - 7 seções de dados
  - Validação de tipos
  - Índices para performance
  
- ✅ Routes API: `backend/src/routes/hirings.ts`
  - GET /api/hirings (listar)
  - GET /api/hirings/:id (detalhe)
  - POST /api/hirings (criar)
  - PUT /api/hirings/:id (atualizar)
  - PATCH /api/hirings/:id/approve (aprovar)
  - PATCH /api/hirings/:id/reject (rejeitar)
  - DELETE /api/hirings/:id (deletar)

### 2. **Frontend**
- ✅ Componente: `frontend/src/pages/HiringPage.tsx`
  - 7 steps/abas para cada seção
  - Componentes reutilizáveis (FormCard, FormSection, FormField)
  - Estado centralizado com useState
  - Preview e salva automática

## 🔧 Próximos Passos de Integração

### 1. **Conectar Routes no Backend**

Editar `backend/src/index.ts`:

```typescript
import hiringRoutes from './routes/hirings';

// Adicionar depois dos outros imports/routes
app.use('/api/hirings', hiringRoutes);
```

### 2. **Criar Hook useHiringForm no Frontend**

Arquivo: `frontend/src/hooks/useHiringForm.ts`

```typescript
import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useHiringForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createHiring = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.post(`${API_URL}/api/hirings`, data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao criar ficha';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateHiring = useCallback(async (id: string, data: any) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.put(`${API_URL}/api/hirings/${id}`, data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao atualizar ficha';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const approveHiring = useCallback(async (id: string, userId: string, userRole: string) => {
    try {
      setLoading(true);
      const response = await axios.patch(
        `${API_URL}/api/hirings/${id}/approve`,
        { userId, userRole }
      );
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao aprovar ficha';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectHiring = useCallback(
    async (id: string, userId: string, userRole: string, motivoRejeicao: string) => {
      try {
        setLoading(true);
        const response = await axios.patch(
          `${API_URL}/api/hirings/${id}/reject`,
          { userId, userRole, motivoRejeicao }
        );
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Erro ao rejeitar ficha';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, createHiring, updateHiring, approveHiring, rejectHiring };
}
```

### 3. **Adicionar Rota de Contratação no Router**

Editar `frontend/src/App.tsx`:

```typescript
import { HiringPage } from '@/pages/HiringPage';

// No objeto de rotas:
{
  path: '/contratacao',
  element: user?.role === 'supervisor' ? <HiringPage /> : <Navigate to="/" />
},
{
  path: '/contratacoes',
  element: ['admin', 'gerente'].includes(user?.role) ? <HiringListPage /> : <Navigate to="/" />
}
```

### 4. **Adicionar Link no Menu Principal**

Editar `frontend/src/pages/Index.tsx` ou `frontend/src/components/Navigation.tsx`:

```typescript
{user?.role === 'supervisor' && (
  <Link
    to="/contratacao"
    className="text-sm bg-muted/50 hover:bg-muted text-foreground px-4 py-2 rounded-lg transition-all font-normal inline-flex items-center gap-2"
  >
    <Plus className="w-4 h-4" />
    Nova Contratação
  </Link>
)}

{['admin', 'gerente'].includes(user?.role) && (
  <Link
    to="/contratacoes"
    className="text-sm bg-muted/50 hover:bg-muted text-foreground px-4 py-2 rounded-lg transition-all font-normal inline-flex items-center gap-2"
  >
    <FileText className="w-4 h-4" />
    Contratações
  </Link>
)}
```

### 5. **Criar Página de Listagem (HiringListPage)**

Arquivo: `frontend/src/pages/HiringListPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useHiringForm } from '@/hooks/useHiringForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';

export function HiringListPage() {
  const [hirings, setHirings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { loading: actionLoading, approveHiring, rejectHiring } = useHiringForm();

  useEffect(() => {
    fetchHirings();
  }, []);

  const fetchHirings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hirings?status=Pendente%20Análise');
      const data = await response.json();
      setHirings(data.data);
    } catch (error) {
      console.error('Erro ao carregar fichas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    await approveHiring(id, 'userId', 'admin');
    fetchHirings();
  };

  const handleReject = async (id: string) => {
    const motivo = prompt('Motivo da rejeição:');
    if (motivo) {
      await rejectHiring(id, 'userId', 'admin', motivo);
      fetchHirings();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovada':
        return <Badge className="bg-green-500">Aprovada</Badge>;
      case 'Rejeitada':
        return <Badge className="bg-red-500">Rejeitada</Badge>;
      case 'Pendente Análise':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      default:
        return <Badge className="bg-gray-500">Em Preenchimento</Badge>;
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold mb-8">Fichas de Admissão</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Contratações Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Candidato</th>
                  <th className="text-left p-4">Cargo</th>
                  <th className="text-left p-4">Data</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {hirings.map((hiring: any) => (
                  <tr key={hiring._id} className="border-b hover:bg-muted/50">
                    <td className="p-4">{hiring.dadosPessoais.nomeCompleto}</td>
                    <td className="p-4">{hiring.informacoesAdmissao.cargo}</td>
                    <td className="p-4">{formatDate(hiring.criadoEm)}</td>
                    <td className="p-4">
                      {getStatusBadge(hiring.informacoesAdmissao.statusAdmissao)}
                    </td>
                    <td className="p-4 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(hiring._id)}
                        disabled={actionLoading}
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(hiring._id)}
                        disabled={actionLoading}
                      >
                        Rejeitar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 📋 Checklist de Implementação

- [ ] Conectar routes no backend (`backend/src/index.ts`)
- [ ] Criar hook `useHiringForm.ts`
- [ ] Adicionar rota em `App.tsx`
- [ ] Adicionar links no menu
- [ ] Criar `HiringListPage.tsx`
- [ ] Testar fluxo completo localmente
- [ ] Implementar validações server-side
- [ ] Adicionar autenticação/autorização
- [ ] Criar testes unitários
- [ ] Deploy em produção

## 🎯 Funcionalidades Avançadas (Futuro)

- [ ] Upload de documentos/anexos
- [ ] Assinatura digital
- [ ] Notificações por email
- [ ] Integração com RH (folha de pagamento)
- [ ] Análise de crédito/antecedentes
- [ ] Relatórios e exportação
- [ ] Template de emails
- [ ] Workflow customizável

## 📞 Contato

Para dúvidas ou sugestões sobre a implementação, revise a documentação em `FICHA_ADMISSIONAL_PLAN.md`.
