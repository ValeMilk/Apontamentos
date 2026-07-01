import { Router, Request, Response } from 'express';
import { Hiring, IHiring } from '../models/Hiring';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * LISTAR todas as fichas de admissão
 * GET /api/hirings
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, supervisorId } = req.query;
    const skip = ((Number(page) - 1) * Number(limit)) || 0;

    const filter: any = { empresaId: req.body.empresaId || 'default' };

    if (status) filter['informacoesAdmissao.statusAdmissao'] = status;
    if (supervisorId) filter.criadoPor = supervisorId;

    const hirings = await Hiring.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ criadoEm: -1 });

    const total = await Hiring.countDocuments(filter);

    res.json({
      data: hirings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar fichas de admissão' });
  }
});

/**
 * OBTER uma ficha específica
 * GET /api/hirings/:id
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const hiring = await Hiring.findById(req.params.id);
    if (!hiring) {
      return res.status(404).json({ error: 'Ficha de admissão não encontrada' });
    }
    res.json(hiring);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter ficha de admissão' });
  }
});

/**
 * CRIAR nova ficha de admissão
 * POST /api/hirings
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { dadosPessoais, dadosContato, informacoesAdmissao } = req.body;

    // Validações básicas
    if (!dadosPessoais?.nomeCompleto) {
      return res.status(400).json({ error: 'Nome completo é obrigatório' });
    }
    if (!dadosContato?.endereco) {
      return res.status(400).json({ error: 'Endereço é obrigatório' });
    }
    if (!informacoesAdmissao?.cargo) {
      return res.status(400).json({ error: 'Cargo é obrigatório' });
    }

    const newHiring = new Hiring({
      ...req.body,
      criadoPor: req.body.userId || 'system',
      atualizadoPor: req.body.userId || 'system',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      versao: 1,
    });

    await newHiring.save();
    res.status(201).json(newHiring);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao criar ficha de admissão' });
  }
});

/**
 * ATUALIZAR ficha de admissão
 * PUT /api/hirings/:id
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Não permite atualizar campos de auditoria diretamente
    delete updates.criadoEm;
    delete updates.criadoPor;

    const hiring = await Hiring.findByIdAndUpdate(
      id,
      {
        ...updates,
        atualizadoPor: req.body.userId || 'system',
        atualizadoEm: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!hiring) {
      return res.status(404).json({ error: 'Ficha de admissão não encontrada' });
    }

    res.json(hiring);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao atualizar ficha de admissão' });
  }
});

/**
 * APROVAR ficha de admissão (apenas admin/gerente)
 * PATCH /api/hirings/:id/approve
 */
router.patch('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userRole } = req.body;

    if (!['admin', 'gerente'].includes(userRole)) {
      return res.status(403).json({ error: 'Sem permissão para aprovar' });
    }

    const hiring = await Hiring.findByIdAndUpdate(
      id,
      {
        'informacoesAdmissao.statusAdmissao': 'Aprovada',
        atualizadoPor: req.body.userId || 'system',
        atualizadoEm: new Date(),
      },
      { new: true }
    );

    if (!hiring) {
      return res.status(404).json({ error: 'Ficha de admissão não encontrada' });
    }

    res.json(hiring);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar ficha de admissão' });
  }
});

/**
 * REJEITAR ficha de admissão (apenas admin/gerente)
 * PATCH /api/hirings/:id/reject
 */
router.patch('/:id/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userRole, motivoRejeicao } = req.body;

    if (!['admin', 'gerente'].includes(userRole)) {
      return res.status(403).json({ error: 'Sem permissão para rejeitar' });
    }

    if (!motivoRejeicao) {
      return res.status(400).json({ error: 'Motivo da rejeição é obrigatório' });
    }

    const hiring = await Hiring.findByIdAndUpdate(
      id,
      {
        'informacoesAdmissao.statusAdmissao': 'Rejeitada',
        'informacoesAdmissao.motivoRejeicao': motivoRejeicao,
        atualizadoPor: req.body.userId || 'system',
        atualizadoEm: new Date(),
      },
      { new: true }
    );

    if (!hiring) {
      return res.status(404).json({ error: 'Ficha de admissão não encontrada' });
    }

    res.json(hiring);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rejeitar ficha de admissão' });
  }
});

/**
 * DELETAR ficha de admissão
 * DELETE /api/hirings/:id
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userRole } = req.body;

    if (!['admin', 'gerente'].includes(userRole)) {
      return res.status(403).json({ error: 'Sem permissão para deletar' });
    }

    const hiring = await Hiring.findByIdAndDelete(id);

    if (!hiring) {
      return res.status(404).json({ error: 'Ficha de admissão não encontrada' });
    }

    res.json({ message: 'Ficha de admissão deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar ficha de admissão' });
  }
});

export default router;
