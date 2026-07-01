import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHiringForm } from '@/hooks/useHiringForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormCard, FormSection, FormField, EmptyState } from '@/components/ui/form-components';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  MapPin,
  FileText,
  Banknote,
  Briefcase,
  ShoppingBag,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface HiringFormData {
  dadosPessoais: any;
  dadosContato: any;
  documentos: any;
  dadosBancarios: any;
  informacoesAdmissao: any;
  beneficiosFardamento: any;
  checklistDocumentos: any[];
}

const STEPS = [
  { id: 1, label: 'Dados Pessoais', icon: User },
  { id: 2, label: 'Contato', icon: MapPin },
  { id: 3, label: 'Documentos', icon: FileText },
  { id: 4, label: 'Bancário', icon: Banknote },
  { id: 5, label: 'Admissão', icon: Briefcase },
  { id: 6, label: 'Benefícios', icon: ShoppingBag },
  { id: 7, label: 'Checklist', icon: CheckCircle2 },
];

const DOCUMENTOS_CHECKLIST = [
  'CTPS e PIS Ativo',
  'RG',
  'CPF',
  'Título de Eleitor',
  'Comprovante de Residência Atual',
  'Carteira de Reservista',
  'CNH',
  '2 Fotos 3x4',
  'Carta de Recomendação',
  'Certidão de Nascimento dos filhos (<14 anos)',
  'Declaração da Escola (>5 anos)',
  'Cartão de Vacina (<5 anos)',
  'Certidão de Casamento/Divórcio',
  'Exame Admissional',
  'Comprovante de Escolaridade',
  'Conta Bancária',
  'Autodeclaração Étnico-Racial',
];

export function HiringForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, error: hookError, createHiring } = useHiringForm();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<HiringFormData>({
    dadosPessoais: {},
    dadosContato: {},
    documentos: {},
    dadosBancarios: {},
    informacoesAdmissao: {},
    beneficiosFardamento: {},
    checklistDocumentos: DOCUMENTOS_CHECKLIST.map((doc) => ({
      documento: doc,
      status: 'Pendente',
    })),
  });

  const handleStepChange = (stepId: number) => {
    setCurrentStep(stepId);
    setError('');
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof HiringFormData],
        [field]: value,
      },
    }));
  };

  const validateFormData = () => {
    // Validações básicas obrigatórias
    if (!formData.dadosPessoais?.nomeCompleto) {
      setError('Nome completo é obrigatório');
      setCurrentStep(1);
      return false;
    }
    if (!formData.dadosContato?.endereco) {
      setError('Endereço é obrigatório');
      setCurrentStep(2);
      return false;
    }
    if (!formData.documentos?.cpf) {
      setError('CPF é obrigatório');
      setCurrentStep(3);
      return false;
    }
    if (!formData.dadosBancarios?.agencia || !formData.dadosBancarios?.conta) {
      setError('Dados bancários são obrigatórios');
      setCurrentStep(4);
      return false;
    }
    if (!formData.informacoesAdmissao?.cargo || !formData.informacoesAdmissao?.dataAdmissao) {
      setError('Cargo e data de admissão são obrigatórios');
      setCurrentStep(5);
      return false;
    }
    return true;
  };

  const handleSubmit = async (status: 'Em Preenchimento' | 'Pendente Análise' = 'Pendente Análise') => {
    try {
      if (!validateFormData()) return;

      const payload = {
        ...formData,
        empresaId: 'default',
        criadoPor: user?.id || 'system',
        supervisorResponsavel: user?.id,
        informacoesAdmissao: {
          ...formData.informacoesAdmissao,
          statusAdmissao: status,
        },
      };

      await createHiring(payload);
      toast.success(
        status === 'Pendente Análise'
          ? 'Ficha enviada para análise!'
          : 'Ficha salva como rascunho!'
      );
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar ficha');
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Ficha Admissional</h1>
                <p className="text-muted-foreground mt-1">Preencha todos os dados do novo candidato</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isPast = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepChange(step.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground elevation-1'
                      : isPast
                      ? 'bg-muted text-foreground hover:bg-muted/80'
                      : 'bg-card text-muted-foreground hover:bg-card/80 border border-border'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <Card className="mb-8 elevation-2">
          <CardContent className="p-8">
            {currentStep === 1 && <Step1DadosPessoais data={formData.dadosPessoais} onChange={handleInputChange} />}
            {currentStep === 2 && <Step2DadosContato data={formData.dadosContato} onChange={handleInputChange} />}
            {currentStep === 3 && <Step3Documentos data={formData.documentos} onChange={handleInputChange} />}
            {currentStep === 4 && (
              <Step4DadosBancarios data={formData.dadosBancarios} onChange={handleInputChange} />
            )}
            {currentStep === 5 && (
              <Step5InformacoesAdmissao data={formData.informacoesAdmissao} onChange={handleInputChange} />
            )}
            {currentStep === 6 && (
              <Step6BeneficiosFardamento data={formData.beneficiosFardamento} onChange={handleInputChange} />
            )}
            {currentStep === 7 && (
              <Step7ChecklistDocumentos data={formData.checklistDocumentos} onChange={(data) => setFormData((prev) => ({ ...prev, checklistDocumentos: data }))} />
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="flex gap-3">
            {currentStep === STEPS.length ? (
              <>
                <LoadingButton
                  loading={loading}
                  loadingText="Salvando..."
                  onClick={() => handleSubmit('Em Preenchimento')}
                  variant="outline"
                >
                  Salvar como Rascunho
                </LoadingButton>
                <LoadingButton
                  loading={loading}
                  loadingText="Enviando..."
                  onClick={() => handleSubmit('Pendente Análise')}
                >
                  Enviar para Análise
                </LoadingButton>
              </>
            ) : (
              <Button
                onClick={() => handleStepChange(Math.min(STEPS.length, currentStep + 1))}
                className="gap-2"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Passo {currentStep} de {STEPS.length}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function Step1DadosPessoais({ data, onChange }: any) {
  return (
    <FormCard title="Dados Pessoais" description="Informações básicas do candidato">
      <FormSection title="Identificação">
        <FormField label="Nome Completo" required>
          <input
            type="text"
            placeholder="Nome completo"
            value={data.nomeCompleto || ''}
            onChange={(e) => onChange('dadosPessoais', 'nomeCompleto', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
        <FormField label="Data de Nascimento" required>
          <input
            type="date"
            value={data.dataNascimento || ''}
            onChange={(e) => onChange('dadosPessoais', 'dataNascimento', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Sexo">
            <select
              value={data.sexo || ''}
              onChange={(e) => onChange('dadosPessoais', 'sexo', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </FormField>
          <FormField label="Estado Civil">
            <select
              value={data.estadoCivil || ''}
              onChange={(e) => onChange('dadosPessoais', 'estadoCivil', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Selecione</option>
              <option value="Solteiro">Solteiro</option>
              <option value="Casado">Casado</option>
              <option value="Divorciado">Divorciado</option>
              <option value="Viúvo">Viúvo</option>
              <option value="União Estável">União Estável</option>
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Filiação">
        <FormField label="Nome da Mãe">
          <input
            type="text"
            placeholder="Nome da mãe"
            value={data.nomeMae || ''}
            onChange={(e) => onChange('dadosPessoais', 'nomeMae', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
      </FormSection>

      <FormSection title="Escolaridade">
        <FormField label="Grau de Instrução">
          <select
            value={data.grauInstrucao || ''}
            onChange={(e) => onChange('dadosPessoais', 'grauInstrucao', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Selecione</option>
            <option value="Analfabeto">Analfabeto</option>
            <option value="Fundamental Incompleto">Fundamental Incompleto</option>
            <option value="Fundamental Completo">Fundamental Completo</option>
            <option value="Médio Incompleto">Médio Incompleto</option>
            <option value="Médio Completo">Médio Completo</option>
            <option value="Superior Incompleto">Superior Incompleto</option>
            <option value="Superior Completo">Superior Completo</option>
            <option value="Pós-Graduação">Pós-Graduação</option>
          </select>
        </FormField>
      </FormSection>
    </FormCard>
  );
}

function Step2DadosContato({ data, onChange }: any) {
  return (
    <FormCard title="Dados para Contato" description="Endereço e telefones do candidato">
      <FormSection title="Endereço">
        <FormField label="Rua/Avenida" required>
          <input
            type="text"
            placeholder="Endereço"
            value={data.endereco || ''}
            onChange={(e) => onChange('dadosContato', 'endereco', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Bairro" required>
            <input
              type="text"
              placeholder="Bairro"
              value={data.bairro || ''}
              onChange={(e) => onChange('dadosContato', 'bairro', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="Cidade" required>
            <input
              type="text"
              placeholder="Cidade"
              value={data.cidade || ''}
              onChange={(e) => onChange('dadosContato', 'cidade', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="CEP">
            <input
              type="text"
              placeholder="CEP"
              value={data.cep || ''}
              onChange={(e) => onChange('dadosContato', 'cep', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Telefones">
        <FormField label="Celular" required>
          <input
            type="tel"
            placeholder="(11) 99999-9999"
            value={data.telefoneCelular || ''}
            onChange={(e) => onChange('dadosContato', 'telefoneCelular', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
        <FormField label="Telefone Fixo">
          <input
            type="tel"
            placeholder="(11) 3333-3333"
            value={data.telefonFixo || ''}
            onChange={(e) => onChange('dadosContato', 'telefonFixo', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
      </FormSection>
    </FormCard>
  );
}

function Step3Documentos({ data, onChange }: any) {
  return (
    <FormCard title="Documentos" description="Documentação pessoal">
      <FormSection title="Identificação">
        <FormField label="CPF" required>
          <input
            type="text"
            placeholder="000.000.000-00"
            value={data.cpf || ''}
            onChange={(e) => onChange('documentos', 'cpf', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
        <FormField label="RG">
          <input
            type="text"
            placeholder="RG"
            value={data.rg?.numero || ''}
            onChange={(e) =>
              onChange('documentos', 'rg', {
                ...data.rg,
                numero: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
      </FormSection>

      <FormSection title="Documentos Adicionais">
        <FormField label="CTPS">
          <input
            type="text"
            placeholder="CTPS"
            value={data.ctps?.numero || ''}
            onChange={(e) =>
              onChange('documentos', 'ctps', {
                ...data.ctps,
                numero: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
        <FormField label="CNH">
          <input
            type="text"
            placeholder="CNH (opcional)"
            value={data.cnh?.numero || ''}
            onChange={(e) =>
              onChange('documentos', 'cnh', {
                ...data.cnh,
                numero: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
      </FormSection>
    </FormCard>
  );
}

function Step4DadosBancarios({ data, onChange }: any) {
  return (
    <FormCard title="Dados Bancários" description="Informações para depósito de salário">
      <FormSection title="Banco">
        <FormField label="Banco" required>
          <select
            value={data.banco?.codigo || ''}
            onChange={(e) =>
              onChange('dadosBancarios', 'banco', {
                codigo: e.target.value,
                nome: e.target.options[e.target.selectedIndex].text,
              })
            }
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Selecione</option>
            <option value="001">Banco do Brasil</option>
            <option value="033">Santander</option>
            <option value="104">Caixa Econômica</option>
            <option value="237">Bradesco</option>
            <option value="341">Itaú</option>
          </select>
        </FormField>
      </FormSection>

      <FormSection title="Conta">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Agência" required>
            <input
              type="text"
              placeholder="Agência"
              value={data.agencia || ''}
              onChange={(e) => onChange('dadosBancarios', 'agencia', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="Conta" required>
            <input
              type="text"
              placeholder="Conta"
              value={data.conta || ''}
              onChange={(e) => onChange('dadosBancarios', 'conta', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        </div>
        <FormField label="Chave PIX">
          <input
            type="text"
            placeholder="CPF, Email ou Telefone"
            value={data.chavePix || ''}
            onChange={(e) => onChange('dadosBancarios', 'chavePix', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
      </FormSection>
    </FormCard>
  );
}

function Step5InformacoesAdmissao({ data, onChange }: any) {
  return (
    <FormCard title="Informações para Admissão" description="Dados internos da empresa">
      <FormSection title="Cargo">
        <FormField label="Cargo" required>
          <input
            type="text"
            placeholder="Cargo"
            value={data.cargo || ''}
            onChange={(e) => onChange('informacoesAdmissao', 'cargo', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>
      </FormSection>

      <FormSection title="Admissão">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Data de Admissão" required>
            <input
              type="date"
              value={data.dataAdmissao || ''}
              onChange={(e) => onChange('informacoesAdmissao', 'dataAdmissao', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="Salário" required>
            <input
              type="number"
              placeholder="R$ 0,00"
              value={data.salario || ''}
              onChange={(e) => onChange('informacoesAdmissao', 'salario', e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Observações">
        <FormField label="Observações">
          <textarea
            placeholder="Observações adicionais"
            value={data.observacoes || ''}
            onChange={(e) => onChange('informacoesAdmissao', 'observacoes', e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
          />
        </FormField>
      </FormSection>
    </FormCard>
  );
}

function Step6BeneficiosFardamento({ data, onChange }: any) {
  return (
    <FormCard title="Benefícios, Fardamento e Equipamentos">
      <FormSection title="Benefícios">
        <FormField label="Alimentação">
          <select
            value={data.beneficios?.alimentacao?.tipo || 'Não'}
            onChange={(e) =>
              onChange('beneficiosFardamento', 'beneficios', {
                ...data.beneficios,
                alimentacao: { tipo: e.target.value },
              })
            }
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="Não">Não</option>
            <option value="Fechamento Mensal">Fechamento Mensal</option>
            <option value="Fechamento Semanal">Fechamento Semanal</option>
          </select>
        </FormField>
      </FormSection>

      <FormSection title="Fardamento">
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Tamanho Camisa">
            <select
              value={data.fardamento?.camisaTamanho || ''}
              onChange={(e) =>
                onChange('beneficiosFardamento', 'fardamento', {
                  ...data.fardamento,
                  camisaTamanho: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Selecione</option>
              <option value="PP">PP</option>
              <option value="P">P</option>
              <option value="M">M</option>
              <option value="G">G</option>
              <option value="GG">GG</option>
            </select>
          </FormField>
          <FormField label="Tamanho Calça">
            <select
              value={data.fardamento?.calcaTamanho || ''}
              onChange={(e) =>
                onChange('beneficiosFardamento', 'fardamento', {
                  ...data.fardamento,
                  calcaTamanho: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Selecione</option>
              <option value="PP">PP</option>
              <option value="P">P</option>
              <option value="M">M</option>
              <option value="G">G</option>
              <option value="GG">GG</option>
            </select>
          </FormField>
          <FormField label="Numeração Calçado">
            <input
              type="number"
              placeholder="Ex: 40"
              value={data.fardamento?.calcadoNumeracao || ''}
              onChange={(e) =>
                onChange('beneficiosFardamento', 'fardamento', {
                  ...data.fardamento,
                  calcadoNumeracao: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Equipamentos">
        <div className="space-y-3">
          {[
            { key: 'chip', label: 'Chip' },
            { key: 'celular', label: 'Celular' },
            { key: 'notebook', label: 'Notebook' },
            { key: 'veiculo', label: 'Veículo' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.equipamentos?.[key] || false}
                onChange={(e) =>
                  onChange('beneficiosFardamento', 'equipamentos', {
                    ...data.equipamentos,
                    [key]: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </FormSection>
    </FormCard>
  );
}

function Step7ChecklistDocumentos({ data, onChange }: any) {
  return (
    <FormCard title="Checklist de Documentos" description="Marque o status de cada documento">
      <FormSection title="Status da Documentação">
        <div className="space-y-3">
          {data.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <span className="font-medium text-foreground">{item.documento}</span>
              <select
                value={item.status}
                onChange={(e) => {
                  const newData = [...data];
                  newData[index].status = e.target.value;
                  onChange(newData);
                }}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Pendente">Pendente</option>
                <option value="OK">OK</option>
                <option value="Não se Aplica">Não se Aplica</option>
              </select>
            </div>
          ))}
        </div>
      </FormSection>
    </FormCard>
  );
}
