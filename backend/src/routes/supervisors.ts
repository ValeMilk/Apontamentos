import { Router } from 'express';
import { User } from '../models/User.js';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';

const router = Router();

const hasAnyTeam = (user: any) => {
  const employees = Array.isArray(user?.employees) ? user.employees : [];
  return employees.length > 0;
};

const isEmployeeTeam = (user: any) => {
  const employees = Array.isArray(user?.employees) ? user.employees : [];
  if (employees.length === 0) return false;
  return employees.some((e: any) => String(e?.role || '').toLowerCase() !== 'supervisor');
};

// Authenticated endpoint to list supervisors filtered by requester role
router.get('/', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;

    // Admin (apontador) sees all supervisor environments (including managers like Rodney)
    if (role === 'admin') {
      const all = await User.find({ role: 'supervisor', isActive: true })
        .select('name supervisorId employees role')
        .lean();
      return res.json(all.map((s: any) => ({ _id: s._id, name: s.name, supervisorId: s.supervisorId, employees: s.employees, role: s.role })));
    }

    // Expectador sees supervisors (with or without team)
    if (role === 'expectador') {
      const list = await User.find({ role: 'supervisor', isActive: true }).select('name supervisorId employees').lean();
      return res.json(list.map((s: any) => ({ _id: s._id, name: s.name, supervisorId: s.supervisorId, employees: s.employees })));
    }

    // Supervisor sees only their own supervisor environment (their user doc)
    if (role === 'supervisor') {
      const me = await User.findById(req.userId).select('name supervisorId employees role').lean();
      if (!me) return res.status(404).json({ message: 'Supervisor not found' });
      if (me.role !== 'supervisor') return res.status(403).json({ message: 'Not a supervisor' });
      return res.json([{ _id: me._id, name: me.name, supervisorId: me.supervisorId, employees: me.employees, role: me.role }]);
    }

    // Default: return supervisors only
    const sup = await User.find({ role: 'supervisor', isActive: true }).select('name supervisorId employees').lean();
    res.json(sup.map((s: any) => ({ _id: s._id, name: s.name, supervisorId: s.supervisorId, employees: s.employees })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch supervisors' });
  }
});

export default router;
