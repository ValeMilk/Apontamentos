import { Router } from 'express';
import { authenticateJWT, AuthRequest, requireRole } from '../middleware/auth.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Justification } from '../models/Justification.js';
import { User } from '../models/User.js';
import { Employee } from '../models/Employee.js';
import { MonthStatus } from '../models/MonthStatus.js';
import { AuditLog } from '../models/AuditLog.js';
import { Types } from 'mongoose';
import { uploadAtestado } from '../middleware/upload.js';

// simple slug helper
function slugify(s: string) {
  return String(s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

// Extract month from ISO date (YYYY-MM-DD -> YYYY-MM)
function getMonthFromDay(day: string): string {
  const parts = String(day || '').split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return '';
}

function inferSupervisorIdFromEmployeeId(employeeId: string, knownSupervisorIds: string[]) {
  const raw = String(employeeId || '').trim();
  if (!raw) return '';

  const sorted = [...(knownSupervisorIds || [])]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const supervisorId of sorted) {
    if (raw === supervisorId || raw.startsWith(`${supervisorId}-`)) {
      return supervisorId;
    }
  }

  return raw.includes('-') ? raw.split('-')[0] : raw;
}

const router = Router();

// Upsert multiple attendance records
router.post('/', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;
    if (role === 'expectador') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const records: any[] = req.body.records || [];
    if (!Array.isArray(records)) return res.status(400).json({ message: 'Invalid payload' });

    // Check if any record's month is locked (for supervisors and gerentes)
    if ((role === 'supervisor' || role === 'gerente') && records.length > 0) {
      const months = new Set(records.map(r => getMonthFromDay(String(r.day || ''))).filter(Boolean));
      for (const month of months) {
        const status = await MonthStatus.findOne({ month }).lean();
        if (status?.isLocked) {
          return res.status(403).json({
            message: `Month ${month} is locked. Admin must unlock it first.`,
            month,
            locked: true,
          });
        }
      }
    }

    const knownSupervisorIds = (
      await User.find({ role: 'supervisor' }).select('supervisorId').lean()
    )
      .map((u: any) => String(u?.supervisorId || '').trim())
      .filter(Boolean);

    const ops = records.map(r => {
      const rawEmployeeId: string = r.employeeId || '';
      const providedName: string = r.employeeName || '';
      const supFromId = inferSupervisorIdFromEmployeeId(rawEmployeeId, knownSupervisorIds);
      const supervisorId = (r.supervisorId || supFromId || (req.user && (req.user as any).supervisorId) || '').toString();
      const nameForSlug = providedName || (rawEmployeeId && rawEmployeeId.includes('-') ? rawEmployeeId.split('-').slice(1).join('-') : rawEmployeeId);
      const slug = slugify(nameForSlug || 'employee');
      const canonicalId = `${supervisorId}-${slug}`;

      return {
        canonicalId,
        day: r.day,
        apontador: r.apontador || '',
        supervisor: r.supervisor || '',
        createdBy: req.userId,
        supervisorId: supervisorId,
        employeeName: providedName || nameForSlug || slug,
      };
    });

    if (ops.length === 0) {
      return res.json({ ok: true, saved: 0 });
    }

    // Do not create employees from attendance payload.
    // Only update metadata when the employee already exists.
    try {
      await Employee.bulkWrite(
        ops.map((r) => ({
          updateOne: {
            filter: { supervisorId: r.supervisorId, slug: slugify(r.employeeName || r.canonicalId) },
            update: { $set: { name: r.employeeName, displayName: r.employeeName } },
            upsert: false,
          },
        })),
        { ordered: false }
      );
    } catch (e) {
      // ignore employee upsert errors
    }

    await AttendanceRecord.bulkWrite(
      ops.map((r) => ({
        updateOne: {
          filter: {
            employeeId: r.canonicalId,
            day: r.day,
            $or: [
              { supervisorId: r.supervisorId },
              { supervisorId: { $exists: false } },
              { supervisorId: '' },
            ],
          },
          update: {
            $set: {
              apontador: r.apontador,
              supervisor: r.supervisor,
              createdBy: r.createdBy ? new Types.ObjectId(String(r.createdBy)) : null,
              supervisorId: r.supervisorId,
              employeeName: r.employeeName,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    // Audit log: record attendance changes
    try {
      const userName = req.user?.name || req.user?.username || '';
      const userRole = req.user?.role || '';
      const auditEntries = ops.map((r) => ({
        action: 'attendance_update' as const,
        userId: new Types.ObjectId(String(req.userId)),
        userName,
        userRole,
        targetType: 'attendance' as const,
        description: `${userName} alterou presença de ${r.employeeName} em ${r.day}`,
        details: {
          employeeId: r.canonicalId,
          employeeName: r.employeeName,
          day: r.day,
          apontador: r.apontador,
          supervisor: r.supervisor,
          supervisorId: r.supervisorId,
        },
      }));
      AuditLog.insertMany(auditEntries).catch(() => {});
    } catch (_) {}

    res.json({ ok: true, saved: ops.length });
  } catch (e) {
    console.error('Failed to save attendance:', e);
    res.status(500).json({ message: 'Failed to save attendance' });
  }
});

// Get attendance records. Phase 2 Optimization: Use supervisorId index instead of full table scan
router.get('/', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { supervisorId, changedOnly, startDay, endDay } = req.query;
    const role = req.user?.role;
    const wantsChangedOnly = String(changedOnly || 'false').toLowerCase() === 'true';
    const inPeriod = (day: string) => {
      if (!day) return false;
      if (startDay && String(day) < String(startDay)) return false;
      if (endDay && String(day) > String(endDay)) return false;
      return true;
    };
    const isChanged = (r: any) => String(r?.apontador || '').trim() !== '' || String(r?.supervisor || '').trim() !== '';

    if (role === 'supervisor') {
      // Phase 2: Use index { supervisorId: 1, day: 1 } instead of full table scan
      const user = await User.findById(req.userId).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      // Query: supervisorId matches + allow global records
      const query: any = {
        $or: [
          { supervisorId: user.supervisorId },
          { supervisorId: 'global' }
        ]
      };
      
      if (startDay || endDay) {
        query.day = {};
        if (startDay) query.day.$gte = String(startDay);
        if (endDay) query.day.$lte = String(endDay);
      }
      
      // O(log n + k) with index { supervisorId: 1, day: 1 }
      let recs = await AttendanceRecord.find(query).lean();
      if (wantsChangedOnly) recs = recs.filter(r => isChanged(r));
      return res.json(recs);
    }

    if (role === 'gerente') {
      // Gerente sees ALL attendance records (like admin)
      const query: any = {};
      if (startDay || endDay) {
        query.day = {};
        if (startDay) query.day.$gte = String(startDay);
        if (endDay) query.day.$lte = String(endDay);
      }
      let recs = await AttendanceRecord.find(query).lean();
      if (wantsChangedOnly) recs = recs.filter(r => isChanged(r));
      return res.json(recs);
    }

    if (role === 'admin' || role === 'expectador') {
      // Allow admin and expectador to request optionally by supervisorId
      if (supervisorId) {
        const sup = (supervisorId as string);
        const query: any = { supervisorId: sup };
        
        if (startDay || endDay) {
          query.day = {};
          if (startDay) query.day.$gte = String(startDay);
          if (endDay) query.day.$lte = String(endDay);
        }
        
        // Phase 2: Use supervisorId index instead of regex - O(log n + k)
        let recs = await AttendanceRecord.find(query).lean();
        if (wantsChangedOnly) recs = recs.filter(r => isChanged(r));
        return res.json(recs);
      }
      
      // No supervisorId specified: return all (only for admin/full audit)
      let recs = await AttendanceRecord.find({}).lean();
      if (startDay || endDay) recs = recs.filter(r => inPeriod(String(r.day || '')));
      if (wantsChangedOnly) recs = recs.filter(r => isChanged(r));
      return res.json(recs);
    }

    res.status(403).json({ message: 'Insufficient permissions' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// Justifications endpoints
router.post('/justifications', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;
    if (role === 'expectador') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { justifications } = req.body;
    if (!Array.isArray(justifications)) return res.status(400).json({ message: 'Invalid payload' });

    // Check if any justification's month is locked (for supervisors and gerentes)
    if ((role === 'supervisor' || role === 'gerente') && justifications.length > 0) {
      const months = new Set(justifications.map(j => getMonthFromDay(String(j.day || ''))).filter(Boolean));
      for (const month of months) {
        const status = await MonthStatus.findOne({ month }).lean();
        if (status?.isLocked) {
          return res.status(403).json({
            message: `Month ${month} is locked. Admin must unlock it first.`,
            month,
            locked: true,
          });
        }
      }
    }

    const knownSupervisorIds = (
      await User.find({ role: 'supervisor' }).select('supervisorId').lean()
    )
      .map((u: any) => String(u?.supervisorId || '').trim())
      .filter(Boolean);

    // Use bulkWrite instead of sequential findOneAndUpdate for O(1) round trips
    const bulkOps = justifications.map((j: any) => {
      const supervisorIdFromEmployee = inferSupervisorIdFromEmployeeId(j.employeeId || '', knownSupervisorIds);
      return {
        updateOne: {
          filter: { employeeId: j.employeeId, day: j.day },
          update: {
            $set: {
              text: j.text,
              createdBy: req.userId ? new Types.ObjectId(String(req.userId)) : null,
              supervisorId: supervisorIdFromEmployee,
            },
          },
          upsert: true,
        },
      };
    });

    await Justification.bulkWrite(bulkOps, { ordered: false });

    // Fetch the saved documents for the response
    const filters = justifications.map((j: any) => ({ employeeId: j.employeeId, day: j.day }));
    const saved = await Justification.find({ $or: filters }).lean();

    // Audit log (fire and forget)
    try {
      const userName = req.user?.name || req.user?.username || '';
      const userRole = req.user?.role || '';
      const auditEntries = justifications.map((j: any) => ({
        action: 'justification_update' as const,
        userId: new Types.ObjectId(String(req.userId)),
        userName,
        userRole,
        targetType: 'justification' as const,
        description: `${userName} salvou justificativa de ${j.employeeId} em ${j.day}`,
        details: {
          employeeId: j.employeeId,
          day: j.day,
          text: j.text,
        },
      }));
      AuditLog.insertMany(auditEntries).catch(() => {});
    } catch (_) {}

    res.json({ ok: true, saved });
  } catch (e) {
    console.error('Failed to save justifications', e);
    res.status(500).json({ message: 'Failed to save justifications' });
  }
});

router.get('/justifications', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { supervisorId } = req.query;
    const role = req.user?.role;
    if (role === 'supervisor') {
      const user = await User.findById(req.userId).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      // Use denormalized supervisorId field for O(log n + k) index lookup instead of O(n) regex
      const filtered = await Justification.find({ supervisorId: (user as any).supervisorId || '' }).lean();
      return res.json(filtered);
    }
    if (role === 'gerente') {
      // Gerente sees all justifications
      const all = await Justification.find({}).lean();
      return res.json(all);
    }
    if (role === 'admin' || role === 'expectador') {
      if (supervisorId) {
        const sup = supervisorId as string;
        // Use denormalized supervisorId field for O(log n + k) index lookup instead of O(n·m) regex
        const list = await Justification.find({ supervisorId: sup }).lean();
        return res.json(list);
      }
      const all = await Justification.find({}).lean();
      return res.json(all);
    }
    res.status(403).json({ message: 'Insufficient permissions' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch justifications' });
  }
});

router.delete('/justifications', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { id, employeeId, day } = req.body || {};
    if (!id && (!employeeId || !day)) {
      return res.status(400).json({ message: 'id or (employeeId and day) are required' });
    }

    const role = req.user?.role;
    if (role === 'expectador') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    let target: any = null;
    if (id && /^[0-9a-fA-F]{24}$/.test(String(id))) {
      target = await Justification.findById(String(id)).lean();
    }
    if (!target && employeeId && day) {
      target = await Justification.findOne({ employeeId: String(employeeId), day: String(day) }).lean();
    }
    if (!target) return res.json({ ok: true, deleted: false });

    // Check if month is locked (for supervisors and gerentes)
    if (role === 'supervisor' || role === 'gerente') {
      const month = getMonthFromDay(String(target.day || ''));
      if (month) {
        const status = await MonthStatus.findOne({ month }).lean();
        if (status?.isLocked) {
          return res.status(403).json({
            message: `Month ${month} is locked. Admin must unlock it first.`,
            month,
            locked: true,
          });
        }
      }
    }

    if (role === 'supervisor' || role === 'gerente') {
      const user = await User.findById(req.userId).select('supervisorId').lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      const supPrefix = String((user as any).supervisorId || '');
      if (!supPrefix || !String(target.employeeId || '').startsWith(supPrefix)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    // Sempre deletar pelo _id real do target encontrado
    const deleted = await Justification.findByIdAndDelete(target._id);

    // Audit log
    if (deleted) {
      try {
        const userName = req.user?.name || req.user?.username || '';
        const userRole = req.user?.role || '';
        await AuditLog.create({
          action: 'justification_delete',
          userId: new Types.ObjectId(String(req.userId)),
          userName,
          userRole,
          targetType: 'justification',
          description: `${userName} deletou justificativa de ${target.employeeId} em ${target.day}`,
          details: {
            employeeId: target.employeeId,
            day: target.day,
            deletedText: target.text || '',
          },
        });
      } catch (_) {}
    }

    res.json({ ok: true, deleted: !!deleted });
  } catch (e) {
    console.error('Failed to delete justification', e);
    res.status(500).json({ message: 'Failed to delete justification' });
  }
});

// Debug endpoint: inspect effective visibility scope for current session/user.
// Useful to diagnose Admin/Supervisor view mismatches without touching UI layout.
router.get('/debug-scope', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const me = await User.findById(req.userId).select('_id name email role supervisorId').lean();
    if (!me) return res.status(404).json({ message: 'User not found' });

    const role = me.role;
    let employeesQuery: any = {};
    let attendance: any[] = [];

    if (role === 'supervisor' || role === 'gerente') {
      employeesQuery = { supervisorId: { $in: [me.supervisorId, 'global'] } };
      const all = await AttendanceRecord.find({}).lean();
      const prefix = me._id.toString();
      attendance = all.filter(r =>
        (r.supervisorId && (r.supervisorId === me.supervisorId || r.supervisorId === 'global')) ||
        (r.employeeId && r.employeeId.startsWith(prefix)) ||
        (r.employeeId && (r.employeeId.startsWith((me.supervisorId || '')) || (me.supervisorId && r.employeeId.includes(me.supervisorId))))
      );
    } else {
      employeesQuery = {};
      attendance = await AttendanceRecord.find({}).lean();
    }

    const employeesList = await Employee.find(employeesQuery).lean();
    const employees = employeesList.map(e => ({
      id: `${e.supervisorId}-${e.slug}`,
      name: e.name,
      supervisorId: e.supervisorId,
    }));

    const employeeIdsFromAttendance = Array.from(new Set(attendance.map(r => r.employeeId).filter(Boolean))).sort();

    res.json({
      user: me,
      employeesCount: employees.length,
      attendanceCount: attendance.length,
      employees,
      employeeIdsFromAttendance,
    });
  } catch (e) {
    console.error('Failed to fetch debug scope', e);
    res.status(500).json({ message: 'Failed to fetch debug scope' });
  }
});

// Admin-only maintenance: populate supervisorId for existing records derived from employeeId
router.post('/fix-supervisor-ids', authenticateJWT, requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const recs = await AttendanceRecord.find({ $or: [{ supervisorId: { $exists: false } }, { supervisorId: '' }] }).lean();
    const knownSupervisorIds = (
      await User.find({ role: 'supervisor' }).select('supervisorId').lean()
    )
      .map((u: any) => String(u?.supervisorId || '').trim())
      .filter(Boolean);

    for (const r of recs) {
      if (r.employeeId) {
        const sup = inferSupervisorIdFromEmployeeId(String(r.employeeId), knownSupervisorIds);
        if (!sup) continue;
        await AttendanceRecord.updateOne({ _id: r._id }, { $set: { supervisorId: sup } });
      }
    }
    res.json({ ok: true, processed: recs.length });
  } catch (e) {
    console.error('Failed to fix supervisorIds', e);
    res.status(500).json({ message: 'Failed to fix supervisorIds' });
  }
});

// Upload atestado file for AT justification
router.post('/upload-atestado', authenticateJWT, uploadAtestado.single('atestado'), async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;
    if (role === 'expectador') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo não enviado' });
    }

    const { employeeId, day, text } = req.body;
    if (!employeeId || !day) {
      return res.status(400).json({ message: 'employeeId e day são obrigatórios' });
    }

    const filePath = `atestados/${req.file.filename}`;
    const justText = (text || '').trim() || `Atestado — ${day}`;

    // Infer supervisorId from employeeId
    const knownSupervisorIds = (
      await User.find({ role: 'supervisor' }).select('supervisorId').lean()
    )
      .map((u: any) => String(u?.supervisorId || '').trim())
      .filter(Boolean);
    const supervisorId = inferSupervisorIdFromEmployeeId(employeeId, knownSupervisorIds);

    await Justification.findOneAndUpdate(
      { employeeId, day },
      {
        $set: {
          text: justText,
          attestFile: filePath,
          createdBy: req.userId ? new Types.ObjectId(String(req.userId)) : null,
          supervisorId,
        },
      },
      { upsert: true, new: true }
    );

    // Audit log
    try {
      const userName = req.user?.name || req.user?.username || '';
      await AuditLog.create({
        action: 'justification_create',
        userId: new Types.ObjectId(String(req.userId)),
        userName,
        userRole: role,
        targetType: 'justification',
        description: `${userName} anexou atestado de ${employeeId} em ${day}`,
        details: { employeeId, day, attestFile: filePath },
      });
    } catch (_) {}

    res.json({ ok: true, path: filePath });
  } catch (e: any) {
    console.error('Failed to upload atestado', e);
    if (e.message?.includes('Tipo de arquivo')) {
      return res.status(400).json({ message: e.message });
    }
    res.status(500).json({ message: 'Falha ao fazer upload do atestado' });
  }
});

export default router;

