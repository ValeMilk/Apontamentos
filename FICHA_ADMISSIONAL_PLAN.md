# 📋 Plano de Implementação - Ficha Admissional Digital

## 🎯 Objetivo
Digitalizar a "Ficha Admissional" da Vale Milk com 7 seções estruturadas e checklist de documentos.

---

## 📊 Estrutura de Dados

### 1. **DADOS PESSOAIS**
```
- nomeCompleto: string (obrigatório)
- dataNascimento: date
- naturalidade: {
    uf: string (enum: estados brasileiros),
    municipio: string
  }
- sexo: enum ['M', 'F', 'Outro']
- estadoCivil: enum ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União Estável']
- grauInstrucao: enum ['Analfabeto', 'Fundamental Incompleto', 'Fundamental Completo', 'Médio Incompleto', 'Médio Completo', 'Superior Incompleto', 'Superior Completo', 'Pós-Graduação']
- nomeMae: string
- nomePai: string
- numeroDependentes: number
```

### 2. **DADOS PARA CONTATO**
```
- endereco: string (obrigatório)
- complemento: string
- bairro: string
- cidade: string
- estado: string (enum: UF)
- cep: string
- telefoneCelular: string (obrigatório)
- telefonFixo: string
```

### 3. **DOCUMENTOS**
```
- ctps: {
    numero: string,
    serie: string,
    dataEmissao: date
  }
- rg: {
    numero: string,
    orgaoEmissor: string,
    uf: string,
    dataEmissao: date
  }
- cpf: string (obrigatório, validado)
- tituloEleitor: {
    numero: string,
    secao: string,
    dataEmissao: date
  }
- cnh: {
    numero: string,
    categoria: enum ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'],
    validade: date,
    uf: string
  }
- reservista: {
    numero: string,
    dataEmissao: date
  }
```

### 4. **DADOS BANCÁRIOS**
```
- banco: {
    codigo: string (enum: bancos brasileiros),
    nome: string
  }
- agencia: string (obrigatório)
- conta: string (obrigatório)
- digito: string
- operacao: string
- chavePix: string
```

### 5. **INFORMAÇÕES INTERNAS PARA ADMISSÃO**
```
- filialAdmissao: string (obrigatório - seleção de filiais)
- cargo: string (obrigatório)
- dataAdmissao: date (obrigatório)
- salario: number (obrigatório)
- observacoes: string
- supervisorResponsavel: string (referência para usuário admin/gerente)
- statusAdmissao: enum ['Em Preenchimento', 'Pendente Análise', 'Aprovada', 'Rejeitada']
```

### 6. **BENEFÍCIOS, FARDAMENTO E EQUIPAMENTOS**
```
- beneficios: {
    alimentacao: {
      tipo: enum ['Não', 'Fechamento Mensal', 'Fechamento Semanal'],
      valor: number
    },
    transporte: {
      tipo: enum ['Não', 'Fechamento Mensal', 'Fechamento Semanal'],
      valor: number
    },
    outros: [
      {
        descricao: string,
        valor: number
      }
    ]
  }
- fardamento: {
    camisaTamanho: enum ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
    calcaTamanho: enum ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
    calcadoNumeracao: number
  }
- equipamentos: {
    chip: boolean,
    celular: boolean,
    notebook: boolean,
    veiculo: boolean,
    outros: string
  }
```

### 7. **CHECKLIST DE DOCUMENTOS**
```
- documentosEntregues: [
  {
    documento: string,
    status: enum ['OK', 'Pendente', 'Não se Aplica'],
    dataRecebimento: date,
    observacoes: string
  }
]

Documentos Pré-preenchidos:
- CTPS e PIS Ativo
- RG
- CPF
- Título de Eleitor
- Comprovante de Residência Atual
- Carteira de Reservista
- CNH
- 2 Fotos 3x4
- Carta de Recomendação
- Certidão de Nascimento dos filhos (<14 anos)
- Declaração da Escola (>5 anos)
- Cartão de Vacina (<5 anos)
- Certidão de Casamento/Divórcio
- Exame Admissional
- Comprovante de Escolaridade
- Conta Bancária
- Autodeclaração Étnico-Racial
```

---

## 🗂️ Metadados Globais da Ficha

```
- id: ObjectId (auto)
- empresaId: string (referência para company)
- candidatoId: string (referência para employee - quando convertido)
- criadoEm: date
- atualizadoEm: date
- criadoPor: string (userId)
- atualizadoPor: string (userId)
- versao: number (para auditoria)
```

---

## 🏗️ Estrutura de Componentes React

```
📁 frontend/src
├── pages/
│   └── HiringPage.tsx                    # Página principal
├── components/
│   ├── HiringForm/
│   │   ├── HiringFormSteps.tsx           # Controle de abas/steps
│   │   ├── DadosPessoaisStep.tsx         # Seção 1
│   │   ├── DadosContatoStep.tsx          # Seção 2
│   │   ├── DocumentosStep.tsx            # Seção 3
│   │   ├── DadosBancariosStep.tsx        # Seção 4
│   │   ├── InformacoesAdmissaoStep.tsx   # Seção 5
│   │   ├── BeneficiosFardamentoStep.tsx  # Seção 6
│   │   ├── ChecklistDocumentosStep.tsx   # Seção 7
│   │   └── HiringFormPreview.tsx         # Preview da ficha
│   └── HiringTable.tsx                   # Listagem de contratações
├── hooks/
│   └── useHiringForm.ts                  # Hook para gerenciar estado
└── utils/
    └── hiringFormValidator.ts            # Validações
```

---

## 🔄 Fluxo de Preenchimento

1. **Em Preenchimento** (Supervisor inicia a ficha)
2. **Pendente Análise** (Ficha enviada para revisão)
3. **Aprovada** (Gerente/Admin aprova)
4. **Rejeitada** (Com motivo da rejeição)

---

## 🔐 Permissões por Rol

| Rol | Pode Criar | Pode Editar | Pode Aprovar | Pode Visualizar |
|-----|-----------|-----------|------------|-----------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Gerente | ✅ | ✅ | ✅ | ✅ |
| Supervisor | ✅ | ✅ (própria) | ❌ | ✅ (própria) |
| Expectador | ❌ | ❌ | ❌ | ✅ |

---

## 📱 Design System

- Usar components de `FormCard`, `FormSection`, `FormField` já criados
- Loading button para submit
- Modal para preview/assinatura
- Toast notifications para feedback
- Validação em tempo real
- Salva automaticamente como draft

---

## 🚀 Próximas Etapas

1. ✅ Criar schema Mongoose (Hiring model)
2. ✅ Criar rotas API (CRUD + validação)
3. ✅ Componentes React (7 steps)
4. ✅ Integração com sistema existente
5. ✅ Testes e validação
6. ✅ Deploy em produção
