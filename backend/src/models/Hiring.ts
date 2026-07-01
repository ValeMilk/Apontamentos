import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface para TypeScript
 */
export interface IHiring extends Document {
  // Metadados
  empresaId: string;
  candidatoId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string;
  atualizadoPor: string;
  versao: number;

  // 1. DADOS PESSOAIS
  dadosPessoais: {
    nomeCompleto: string;
    dataNascimento: Date;
    naturalidade: {
      uf: string;
      municipio: string;
    };
    sexo: 'M' | 'F' | 'Outro';
    estadoCivil: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'União Estável';
    grauInstrucao: string;
    nomeMae: string;
    nomePai?: string;
    numeroDependentes: number;
  };

  // 2. DADOS PARA CONTATO
  dadosContato: {
    endereco: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    telefoneCelular: string;
    telefonFixo?: string;
  };

  // 3. DOCUMENTOS
  documentos: {
    ctps?: {
      numero: string;
      serie: string;
      dataEmissao?: Date;
    };
    rg?: {
      numero: string;
      orgaoEmissor?: string;
      uf?: string;
      dataEmissao?: Date;
    };
    cpf: string;
    tituloEleitor?: {
      numero: string;
      secao?: string;
      dataEmissao?: Date;
    };
    cnh?: {
      numero: string;
      categoria?: string;
      validade?: Date;
      uf?: string;
    };
    reservista?: {
      numero: string;
      dataEmissao?: Date;
    };
  };

  // 4. DADOS BANCÁRIOS
  dadosBancarios: {
    banco: {
      codigo: string;
      nome: string;
    };
    agencia: string;
    conta: string;
    digito?: string;
    operacao?: string;
    chavePix?: string;
  };

  // 5. INFORMAÇÕES INTERNAS PARA ADMISSÃO
  informacoesAdmissao: {
    filialAdmissao: string;
    cargo: string;
    dataAdmissao: Date;
    salario: number;
    observacoes?: string;
    supervisorResponsavel: string;
    statusAdmissao: 'Em Preenchimento' | 'Pendente Análise' | 'Aprovada' | 'Rejeitada';
    motivoRejeicao?: string;
  };

  // 6. BENEFÍCIOS, FARDAMENTO E EQUIPAMENTOS
  beneficiosFardamento: {
    beneficios: {
      alimentacao: {
        tipo: 'Não' | 'Fechamento Mensal' | 'Fechamento Semanal';
        valor?: number;
      };
      transporte: {
        tipo: 'Não' | 'Fechamento Mensal' | 'Fechamento Semanal';
        valor?: number;
      };
      outros?: Array<{
        descricao: string;
        valor?: number;
      }>;
    };
    fardamento: {
      camisaTamanho?: string;
      calcaTamanho?: string;
      calcadoNumeracao?: number;
    };
    equipamentos: {
      chip: boolean;
      celular: boolean;
      notebook: boolean;
      veiculo: boolean;
      outros?: string;
    };
  };

  // 7. CHECKLIST DE DOCUMENTOS
  checklistDocumentos: Array<{
    documento: string;
    status: 'OK' | 'Pendente' | 'Não se Aplica';
    dataRecebimento?: Date;
    observacoes?: string;
  }>;
}

/**
 * Schema Mongoose para Ficha Admissional
 */
const HiringSchema = new Schema<IHiring>(
  {
    // Metadados
    empresaId: { type: String, required: true },
    candidatoId: { type: String },
    criadoEm: { type: Date, default: Date.now },
    atualizadoEm: { type: Date, default: Date.now },
    criadoPor: { type: String, required: true },
    atualizadoPor: { type: String, required: true },
    versao: { type: Number, default: 1 },

    // 1. DADOS PESSOAIS
    dadosPessoais: {
      nomeCompleto: { type: String, required: true, trim: true },
      dataNascimento: { type: Date },
      naturalidade: {
        uf: { type: String, required: true },
        municipio: { type: String },
      },
      sexo: { type: String, enum: ['M', 'F', 'Outro'] },
      estadoCivil: {
        type: String,
        enum: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União Estável'],
      },
      grauInstrucao: { type: String },
      nomeMae: { type: String, trim: true },
      nomePai: { type: String, trim: true },
      numeroDependentes: { type: Number, default: 0 },
    },

    // 2. DADOS PARA CONTATO
    dadosContato: {
      endereco: { type: String, required: true, trim: true },
      complemento: { type: String, trim: true },
      bairro: { type: String, required: true, trim: true },
      cidade: { type: String, required: true, trim: true },
      estado: { type: String, required: true },
      cep: { type: String, trim: true },
      telefoneCelular: { type: String, required: true, trim: true },
      telefonFixo: { type: String, trim: true },
    },

    // 3. DOCUMENTOS
    documentos: {
      ctps: {
        numero: String,
        serie: String,
        dataEmissao: Date,
      },
      rg: {
        numero: String,
        orgaoEmissor: String,
        uf: String,
        dataEmissao: Date,
      },
      cpf: { type: String, required: true, trim: true },
      tituloEleitor: {
        numero: String,
        secao: String,
        dataEmissao: Date,
      },
      cnh: {
        numero: String,
        categoria: String,
        validade: Date,
        uf: String,
      },
      reservista: {
        numero: String,
        dataEmissao: Date,
      },
    },

    // 4. DADOS BANCÁRIOS
    dadosBancarios: {
      banco: {
        codigo: { type: String, required: true },
        nome: { type: String, required: true },
      },
      agencia: { type: String, required: true, trim: true },
      conta: { type: String, required: true, trim: true },
      digito: { type: String, trim: true },
      operacao: { type: String, trim: true },
      chavePix: { type: String, trim: true },
    },

    // 5. INFORMAÇÕES INTERNAS PARA ADMISSÃO
    informacoesAdmissao: {
      filialAdmissao: { type: String, required: true },
      cargo: { type: String, required: true, trim: true },
      dataAdmissao: { type: Date, required: true },
      salario: { type: Number, required: true },
      observacoes: { type: String, trim: true },
      supervisorResponsavel: { type: String, required: true },
      statusAdmissao: {
        type: String,
        enum: ['Em Preenchimento', 'Pendente Análise', 'Aprovada', 'Rejeitada'],
        default: 'Em Preenchimento',
      },
      motivoRejeicao: { type: String, trim: true },
    },

    // 6. BENEFÍCIOS, FARDAMENTO E EQUIPAMENTOS
    beneficiosFardamento: {
      beneficios: {
        alimentacao: {
          tipo: {
            type: String,
            enum: ['Não', 'Fechamento Mensal', 'Fechamento Semanal'],
            default: 'Não',
          },
          valor: Number,
        },
        transporte: {
          tipo: {
            type: String,
            enum: ['Não', 'Fechamento Mensal', 'Fechamento Semanal'],
            default: 'Não',
          },
          valor: Number,
        },
        outros: [
          {
            descricao: String,
            valor: Number,
            _id: false,
          },
        ],
      },
      fardamento: {
        camisaTamanho: String,
        calcaTamanho: String,
        calcadoNumeracao: Number,
      },
      equipamentos: {
        chip: { type: Boolean, default: false },
        celular: { type: Boolean, default: false },
        notebook: { type: Boolean, default: false },
        veiculo: { type: Boolean, default: false },
        outros: String,
      },
    },

    // 7. CHECKLIST DE DOCUMENTOS
    checklistDocumentos: [
      {
        documento: String,
        status: {
          type: String,
          enum: ['OK', 'Pendente', 'Não se Aplica'],
          default: 'Pendente',
        },
        dataRecebimento: Date,
        observacoes: String,
        _id: false,
      },
    ],
  },
  {
    timestamps: false,
    collection: 'hirings',
  }
);

// Índices para performance
HiringSchema.index({ empresaId: 1, criadoEm: -1 });
HiringSchema.index({ candidatoId: 1 });
HiringSchema.index({ 'informacoesAdmissao.statusAdmissao': 1 });
HiringSchema.index({ 'documentos.cpf': 1 }, { sparse: true });
HiringSchema.index({ criadoPor: 1 });

// Middleware para atualizar atualizadoEm e versao
HiringSchema.pre('save', function (next) {
  this.atualizadoEm = new Date();
  this.versao = (this.versao || 0) + 1;
  next();
});

export const Hiring = mongoose.model<IHiring>('Hiring', HiringSchema);
