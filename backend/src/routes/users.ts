import { Router } from 'express';
import { User } from '../models/User.js';
import { authenticateJWT, AuthRequest, requireRole } from '../middleware/auth.js';
import { Response } from 'express';
import bcryptjs from 'bcryptjs';

const router = Router();

// List users (admin only)
router.get('/', authenticateJWT, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateJWT, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, role, isActive, password, employees } = req.body;
    const update: any = {};

    if (name !== undefined) update.name = String(name).trim();
    if (username !== undefined) update.username = String(username).trim().toLowerCase();
    if (role !== undefined && ['admin', 'supervisor', 'expectador'].includes(role)) update.role = role;
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    if (employees !== undefined) update.employees = employees;
    if (password && String(password).trim().length >= 6) {
      update.password = await bcryptjs.hash(String(password).trim(), 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateJWT, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'Não é possível excluir seu próprio usuário' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

export default router;
