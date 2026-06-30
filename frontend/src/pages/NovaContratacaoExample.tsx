/**
 * EXEMPLO DE USO - Design System Melhorado
 * 
 * Este arquivo demonstra como usar os novos componentes e tokens
 * em uma tela de contratação (exemplo prático)
 */

import { useState } from 'react';
import { FormCard, FormSection, FormField, EmptyState } from "@/components/ui/form-components";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Briefcase, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface NovaContratacaoForm {
  nome: string;
  cpf: string;
  cargo: string;
  supervisorId: string;
  salario: string;
  dataInicio: string;
  observacoes: string;
}

export function NovaContratacaoPage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NovaContratacaoForm>({
    nome: '',
    cpf: '',
    cargo: '',
    supervisorId: '',
    salario: '',
    dataInicio: '',
    observacoes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof NovaContratacaoForm, string>>>({});

  const supervisores = [
    { id: '1', nome: 'João Silva' },
    { id: '2', nome: 'Maria Santos' },
  ];

  function handleChange(field: keyof NovaContratacaoForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo ao editar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof NovaContratacaoForm, string>> = {};

    if (!form.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (!form.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(form.cpf)) {
      newErrors.cpf = 'CPF inválido (formato: 000.000.000-00)';
    }
    if (!form.cargo.trim()) {
      newErrors.cargo = 'Cargo é obrigatório';
    }
    if (!form.supervisorId) {
      newErrors.supervisorId = 'Selecione um supervisor';
    }
    if (!form.dataInicio) {
      newErrors.dataInicio = 'Data de início é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contratacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar contratação');
      }

      toast.success('Contratação criada com sucesso!');
      
      // Resetar formulário
      setForm({
        nome: '',
        cpf: '',
        cargo: '',
        supervisorId: '',
        salario: '',
        dataInicio: '',
        observacoes: '',
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar contratação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    // Navegar de volta ou limpar formulário
    if (Object.values(form).some(v => v.trim())) {
      if (confirm('Deseja descartar as alterações?')) {
        setForm({
          nome: '',
          cpf: '',
          cargo: '',
          supervisorId: '',
          salario: '',
          dataInicio: '',
          observacoes: '',
        });
        setErrors({});
      }
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header da página */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Processo de Contratação
        </h1>
        <p className="text-sm text-muted-foreground">
          Inicie um novo processo de contratação preenchendo os dados abaixo
        </p>
      </div>

      {/* Formulário principal */}
      <FormCard
        title="Nova Contratação"
        description="Dados do novo funcionário"
        icon={<UserPlus className="w-5 h-5" />}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Dados Pessoais */}
          <FormSection
            title="Dados Pessoais"
            description="Informações básicas do candidato"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Nome Completo"
                htmlFor="nome"
                required
                error={errors.nome}
                description="Nome como consta no documento"
              >
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: João Silva Santos"
                  className="focus-enhanced"
                  disabled={loading}
                />
              </FormField>

              <FormField
                label="CPF"
                htmlFor="cpf"
                required
                error={errors.cpf}
              >
                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  className="focus-enhanced"
                  disabled={loading}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Seção 2: Dados Profissionais */}
          <FormSection
            title="Informações Profissionais"
            description="Cargo, salário e supervisor responsável"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Cargo"
                htmlFor="cargo"
                required
                error={errors.cargo}
              >
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => handleChange('cargo', e.target.value)}
                  placeholder="Ex: Assistente Administrativo"
                  className="focus-enhanced"
                  disabled={loading}
                />
              </FormField>

              <FormField
                label="Supervisor Responsável"
                htmlFor="supervisor"
                required
                error={errors.supervisorId}
              >
                <Select
                  value={form.supervisorId}
                  onValueChange={(value) => handleChange('supervisorId', value)}
                  disabled={loading}
                >
                  <SelectTrigger id="supervisor" className="focus-enhanced">
                    <SelectValue placeholder="Selecione o supervisor" />
                  </SelectTrigger>
                  <SelectContent className="elevation-2">
                    {supervisores.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Salário"
                htmlFor="salario"
                description="Valor bruto mensal"
              >
                <Input
                  id="salario"
                  type="text"
                  value={form.salario}
                  onChange={(e) => handleChange('salario', e.target.value)}
                  placeholder="R$ 0,00"
                  className="focus-enhanced"
                  disabled={loading}
                />
              </FormField>

              <FormField
                label="Data de Início"
                htmlFor="dataInicio"
                required
                error={errors.dataInicio}
              >
                <Input
                  id="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => handleChange('dataInicio', e.target.value)}
                  className="focus-enhanced"
                  disabled={loading}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Seção 3: Observações */}
          <FormSection
            title="Observações"
            description="Informações adicionais sobre a contratação"
          >
            <FormField
              label="Observações"
              htmlFor="observacoes"
            >
              <Textarea
                id="observacoes"
                value={form.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                placeholder="Digite observações relevantes..."
                rows={4}
                className="focus-enhanced resize-none"
                disabled={loading}
              />
            </FormField>
          </FormSection>

          {/* Botões de ação */}
          <div className="flex gap-3 justify-end pt-6 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Criando contratação..."
              className="gap-2"
            >
              <Briefcase className="w-4 h-4" />
              Criar Contratação
            </LoadingButton>
          </div>
        </form>
      </FormCard>

      {/* Exemplo de Empty State (quando não há contratações) */}
      {/* 
      <EmptyState
        icon={<Users className="w-16 h-16" />}
        title="Nenhuma contratação em andamento"
        description="Inicie uma nova contratação clicando no botão abaixo"
        action={
          <Button onClick={() => console.log('Nova contratação')}>
            <UserPlus className="w-4 h-4" />
            Nova Contratação
          </Button>
        }
      />
      */}
    </div>
  );
}
