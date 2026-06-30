# 🎨 Design System Improvements - Guia de Uso

## ✅ Melhorias Implementadas

### 1. Design Tokens (Material Design 3)

Variáveis CSS disponíveis globalmente:

#### Spacing Scale (múltiplos de 4px)
```css
var(--spacing-1)  /* 4px */
var(--spacing-2)  /* 8px */
var(--spacing-3)  /* 12px */
var(--spacing-4)  /* 16px */
var(--spacing-6)  /* 24px */
var(--spacing-8)  /* 32px */
var(--spacing-12) /* 48px */
```

#### Elevation (Shadows)
```tsx
// Classes CSS disponíveis
<Card className="elevation-1">      {/* Cards, baixa elevação */}
<Dialog className="elevation-3">    {/* Modals, média elevação */}
<Dropdown className="elevation-2">  {/* Dropdowns, elevação leve */}
```

#### Motion (Transições)
```tsx
// Classes CSS para animações suaves
<div className="transition-smooth">
  {/* Transição padrão: 250ms ease-standard */}
</div>

<div className="motion-duration-short motion-ease-emphasized">
  {/* Transição customizada: 150ms ease-emphasized */}
</div>
```

---

### 2. Contraste WCAG AA ♿

**Cores corrigidas para atingir 4.5:1:**
- `--status-fd` (Feriado): Roxo escurecido
- `--status-abono-trab` (ABT): Roxo ajustado

✅ Todas as células de status agora são acessíveis e legíveis.

---

### 3. LoadingButton Component

#### Uso Básico
```tsx
import { LoadingButton } from "@/components/ui/loading-button";

// Substitui este padrão antigo:
<Button disabled={loading}>
  {loading ? <Loader2 className="animate-spin" /> : "Salvar"}
</Button>

// Por este novo padrão:
<LoadingButton loading={loading}>
  Salvar
</LoadingButton>
```

#### Com texto customizado durante loading
```tsx
<LoadingButton 
  loading={isSaving} 
  loadingText="Salvando..."
>
  Salvar Alterações
</LoadingButton>
```

#### Props disponíveis
```typescript
interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;      // Exibe spinner e desabilita
  loadingText?: string;   // Texto alternativo durante loading
}
```

---

### 4. Form Components (Base para Contratação)

#### FormCard - Card padronizado
```tsx
import { FormCard } from "@/components/ui/form-components";
import { UserPlus } from "lucide-react";

<FormCard
  title="Nova Contratação"
  description="Preencha os dados do novo funcionário"
  icon={<UserPlus className="w-5 h-5" />}
>
  {/* Conteúdo do formulário */}
</FormCard>
```

#### FormSection - Agrupar campos relacionados
```tsx
import { FormSection } from "@/components/ui/form-components";

<FormSection
  title="Dados Pessoais"
  description="Informações básicas do funcionário"
>
  {/* Campos de nome, CPF, RG, etc */}
</FormSection>

<FormSection
  title="Informações Profissionais"
  description="Cargo, salário e supervisor"
>
  {/* Campos de cargo, salário, etc */}
</FormSection>
```

#### FormField - Campo com label e erro
```tsx
import { FormField } from "@/components/ui/form-components";
import { Input } from "@/components/ui/input";

<FormField
  label="Nome Completo"
  htmlFor="nome"
  required
  error={errors.nome}
  description="Nome como consta no documento"
>
  <Input
    id="nome"
    value={nome}
    onChange={(e) => setNome(e.target.value)}
    placeholder="Ex: João Silva"
  />
</FormField>
```

#### EmptyState - Quando não há dados
```tsx
import { EmptyState } from "@/components/ui/form-components";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

<EmptyState
  icon={<Users className="w-16 h-16" />}
  title="Nenhuma contratação pendente"
  description="Inicie uma nova contratação para começar"
  action={
    <Button onClick={handleNovaContratacao}>
      Nova Contratação
    </Button>
  }
/>
```

---

## 🎯 Exemplo Completo - Tela de Contratação

```tsx
import { useState } from 'react';
import { FormCard, FormSection, FormField, EmptyState } from "@/components/ui/form-components";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UserPlus, Briefcase } from "lucide-react";

export function NovaContratacao() {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Salvar contratação
      await api.post('/contratacoes', { nome, ... });
      toast.success('Contratação criada com sucesso!');
    } catch (err) {
      toast.error('Erro ao criar contratação');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <FormCard
        title="Nova Contratação"
        description="Inicie o processo de contratação de um novo funcionário"
        icon={<UserPlus className="w-5 h-5" />}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <FormSection
            title="Dados Pessoais"
            description="Informações básicas do candidato"
          >
            <FormField
              label="Nome Completo"
              htmlFor="nome"
              required
              error={errors.nome}
            >
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do candidato"
                className="focus-enhanced"
              />
            </FormField>

            {/* Mais campos... */}
          </FormSection>

          <FormSection
            title="Informações Profissionais"
            description="Cargo e vinculação"
          >
            {/* Campos de cargo, supervisor, etc */}
          </FormSection>

          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button variant="secondary" type="button">
              Cancelar
            </Button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Criando..."
            >
              <Briefcase className="w-4 h-4" />
              Criar Contratação
            </LoadingButton>
          </div>
        </form>
      </FormCard>
    </div>
  );
}
```

---

## 🎨 Hierarquia de Botões (Padrão)

```tsx
// ✅ Primário - Ação principal
<Button variant="default">Salvar</Button>
<LoadingButton loading={...}>Confirmar</LoadingButton>

// ⚪ Secundário - Ações alternativas
<Button variant="secondary">Cancelar</Button>
<Button variant="outline">Voltar</Button>

// 👻 Ghost - Ações terciárias/discretas
<Button variant="ghost">Ver mais</Button>
<Button variant="ghost" size="icon">
  <RefreshCw className="w-4 h-4" />
</Button>

// 🔴 Destructive - Ações destrutivas
<Button variant="destructive">Deletar</Button>
<Button variant="destructive">Remover Contratação</Button>
```

---

## ✅ Garantias de Compatibilidade

- ✅ **Zero breaking changes** - Todo código existente continua funcionando
- ✅ **Opt-in** - Use os novos componentes apenas onde fizer sentido
- ✅ **Performance** - Tokens CSS são mais eficientes que inline styles
- ✅ **Acessibilidade** - WCAG AA garantido em todas as cores
- ✅ **Mobile Ready** - Todos os componentes são responsivos

---

## 📦 Próximos Passos Recomendados

Para a tela de **Processo de Contratação**:

1. ✅ Use `FormCard` como container principal
2. ✅ Divida em `FormSection` (Dados Pessoais, Dados Profissionais, Documentos)
3. ✅ Use `FormField` para cada campo com validação
4. ✅ Use `LoadingButton` no submit
5. ✅ Use `EmptyState` quando não houver contratações pendentes
6. ✅ Aplique `elevation-2` em cards de lista
7. ✅ Use `transition-smooth` em hover states

---

Desenvolvido seguindo **Material Design 3**, **Apple HIG** e **WCAG 2.1 AA** ✨
