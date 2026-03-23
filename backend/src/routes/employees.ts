import { Router } from 'express';
import { Employee } from '../models/Employee.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { User } from '../models/User.js';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';

const router = Router();

const slugify = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeName = (name: string) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isObjectIdLike = (value: string) => /^[a-f0-9]{24}$/i.test(String(value || ''));

const pickPreferred = (list: any[], preferredIds?: Set<string>) => {
  const sorted = [...list].sort((a, b) => {
    const aPreferred = preferredIds?.has(a.id) ? 1 : 0;
    const bPreferred = preferredIds?.has(b.id) ? 1 : 0;
    if (aPreferred !== bPreferred) return bPreferred - aPreferred;

    const aObj = isObjectIdLike(String(a.supervisorId || '')) ? 0 : 1;
    const bObj = isObjectIdLike(String(b.supervisorId || '')) ? 0 : 1;
    if (aObj !== bObj) return bObj - aObj;

    const aGlobal = String(a.supervisorId || '') === 'global' ? 1 : 0;
    const bGlobal = String(b.supervisorId || '') === 'global' ? 1 : 0;
    if (aGlobal !== bGlobal) return aGlobal - bGlobal;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  return sorted[0] || null;
};

const areLikelySamePerson = (aName: string, bName: string) => {
  const a = normalizeName(aName);
  const b = normalizeName(bName);
  if (!a || !b) return false;
  if (a === b) return true;

  // Handle legacy/global alias patterns: "max" vs "max-felix-monteiro"
  const aParts = a.split('-').filter(Boolean);
  const bParts = b.split('-').filter(Boolean);
  const aSingle = aParts.length === 1;
  const bSingle = bParts.length === 1;
  if (aSingle && b.startsWith(`${a}-`)) return true;
  if (bSingle && a.startsWith(`${b}-`)) return true;
  return false;
};

const collapseGlobalAliases = (list: any[]) => {
  const groups: any[][] = [];
  for (const item of list || []) {
    const found = groups.find(group => {
      const hasGlobal = group.some(g => String(g.supervisorId || '') === 'global') || String(item.supervisorId || '') === 'global';
      if (!hasGlobal) return false;
      return group.some(g => areLikelySamePerson(String(g.name || g.id || ''), String(item.name || item.id || '')));
    });
    if (found) {
      found.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups.map(group => pickPreferred(group)).filter(Boolean);
};

const dedupeByName = (list: any[], preferredIds?: Set<string>) => {
  const groups = new Map<string, any[]>();
  for (const item of list || []) {
    const key = normalizeName(item?.name || item?.id || '');
    if (!key) continue;
    const arr = groups.get(key) || [];
    arr.push(item);
    groups.set(key, arr);
  }

  const out: any[] = [];
  for (const [, group] of groups) {
    const chosen = pickPreferred(group, preferredIds);
    if (chosen) out.push(chosen);
  }
  return out;
};

const extractNameFromEmployeeId = (employeeId: string) => {
  const raw = String(employeeId || '');
  const parts = raw.split('-');
  if (parts.length <= 1) return raw;
  return parts.slice(1).join('-');
};

const extractNameWithSupervisorPrefixes = (employeeId: string, supervisorIds: string[]) => {
  const raw = String(employeeId || '');
  const sortedSupIds = [...(supervisorIds || [])]
    .map(s => String(s || '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const supId of sortedSupIds) {
    const prefix = `${supId}-`;
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length);
    }
  }

  return extractNameFromEmployeeId(raw);
};

const pickCanonicalRecordName = (employeeName: string, employeeId: string, supervisorIds: string[]) => {
  const byId = extractNameWithSupervisorPrefixes(employeeId, supervisorIds);
  const byName = String(employeeName || '').trim();
  if (!byName) return byId;
  if (!byId) return byName;

  const byIdNorm = normalizeName(byId);
  const byNameNorm = normalizeName(byName);
  if (byNameNorm === byIdNorm) return byName;
  if (byNameNorm.endsWith(byIdNorm)) return byId;

  const byIdParts = byIdNorm.split('-').filter(Boolean).length;
  const byNameParts = byNameNorm.split('-').filter(Boolean).length;
  return byIdParts <= byNameParts ? byId : byName;
};

// GET /api/employees?supervisorId=...&page=1&limit=50 (Phase 3: pagination)
router.get('/', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { supervisorId, supervisorUserId, changedOnly, startDay, endDay, page, limit } = req.query;
    const role = req.user?.role;
    const requesterSupervisorId = req.user?.supervisorId;
    const wantsChangedOnly = String(changedOnly || 'false').toLowerCase() === 'true';
    
    // Phase 3: Pagination support
    const pageNum = Math.max(1, parseInt(String(page || '1')));
    const pageSize = Math.max(1, Math.min(200, parseInt(String(limit || '50')))); // cap at 200
    const skip = (pageNum - 1) * pageSize;

    let supervisorUsers: any[] = [];
    if (role === 'supervisor') {
      const me = await User.findById(req.userId).select('name supervisorId employees role').lean();
      if (!me || (me as any).role !== 'supervisor') {
        return res.status(404).json({ message: 'Supervisor not found' });
      }

      supervisorUsers = [me];
    } else if (role === 'gerente') {
      // Gerente: employees = all supervisors
      const me = await User.findById(req.userId).select('_id').lean();
      const gerenteUserId = String((me as any)?._id || req.userId);
      const allSupervisors = await User.find({ role: 'supervisor', isActive: true })
        .select('name supervisorId _id').lean();
      const result = allSupervisors.map((s: any) => ({
        id: `gerente-${slugify(String(s.name || ''))}`,
        name: slugify(String(s.name || '')),
        role: 'SUPERVISOR',
        supervisorId: 'gerente',
        supervisorUserId: gerenteUserId,
      }));
      const total = result.length;
      const paginated = result.slice(skip, skip + pageSize);
      return res.json({
        employees: paginated,
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      });
    } else {
      const rosterQuery: any = { role: { $in: ['supervisor', 'gerente'] }, isActive: true };
      if (supervisorUserId) {
        const selected = await User.findOne({ _id: String(supervisorUserId), role: { $in: ['supervisor', 'gerente'] }, isActive: true })
          .select('name supervisorId employees role')
          .lean();

        if (!selected) {
          supervisorUsers = [];
        } else if ((selected as any).role === 'gerente') {
          // Gerente selected: return all supervisors as their employees
          const gerenteUserId = String((selected as any)._id || '');
          const allSupervisors = await User.find({ role: 'supervisor', isActive: true })
            .select('name supervisorId _id').lean();
          const result = allSupervisors.map((s: any) => ({
            id: `gerente-${slugify(String(s.name || ''))}`,
            name: slugify(String(s.name || '')),
            role: 'SUPERVISOR',
            supervisorId: 'gerente',
            supervisorUserId: gerenteUserId,
          }));
          const total = result.length;
          const paginated = result.slice(skip, skip + pageSize);
          return res.json({
            employees: paginated,
            total,
            page: pageNum,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize)
          });
        } else {
          const selectedEmps = Array.isArray((selected as any).employees) ? (selected as any).employees : [];
          const allAreSupervisors =
            selectedEmps.length > 0 &&
            selectedEmps.every((e: any) => String(e?.role || '').toLowerCase() === 'supervisor');

          if (allAreSupervisors) {
            // Manager view (ex.: Rodney): return the sub-supervisors themselves as the employee list
            const managerSupId = String((selected as any).supervisorId || '');
            const subSupervisors = await User.find({
              role: 'supervisor',
              isActive: true,
              supervisorId: managerSupId,
              _id: { $ne: (selected as any)._id },
            }).select('name supervisorId').lean();

            const result = subSupervisors.map((s: any) => ({
              id: `${managerSupId}-${slugify(String(s.name || ''))}`,
              name: slugify(String(s.name || '')),
              role: 'LIDER DE EQUIPE',
              supervisorId: String((s as any).supervisorId || managerSupId),
            }));
            return res.json(result);
          } else {
            supervisorUsers = [selected];
          }
        }
      } else {
        if (supervisorId) rosterQuery.supervisorId = String(supervisorId);
        supervisorUsers = await User.find(rosterQuery).select('name supervisorId employees').lean();
      }
    }

    // Canonical source for Admin and team views: supervisor roster (User.employees)
    const rosterEmployees: any[] = [];
    for (const sup of supervisorUsers) {
      const supId = String((sup as any).supervisorId || '');
      const supUserId = String((sup as any)._id || '');
      const emps = Array.isArray((sup as any).employees) ? (sup as any).employees : [];
      for (const emp of emps) {
        const roleName = String(emp?.role || '').toLowerCase();
        if (roleName === 'supervisor') continue;
        const name = String(emp?.name || '').trim();
        if (!name) continue;
        const id = `${supId}-${slugify(name)}`;
        rosterEmployees.push({ id, name: slugify(name), role: emp.role || '', supervisorId: supId, supervisorUserId: supUserId });
      }
    }

    // Keep globally shared employees from Employee collection.
    const globalList = await Employee.find({ supervisorId: 'global' }).lean();
    const globalEmployees = globalList.map(e => ({
      id: `${e.supervisorId}-${e.slug}`,
      name: e.name,
      supervisorId: e.supervisorId,
    }));

    let base = dedupeByName([...(rosterEmployees || []), ...(globalEmployees || [])]);
    base = collapseGlobalAliases(base);

    if (!wantsChangedOnly) {
      // Phase 3: Apply pagination before returning
      const total = base.length;
      const paginated = base.slice(skip, skip + pageSize);
      return res.json({
        employees: paginated,
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      });
    }

    const attQuery: any = {};
    if (startDay || endDay) {
      attQuery.day = {};
      if (startDay) attQuery.day.$gte = String(startDay);
      if (endDay) attQuery.day.$lte = String(endDay);
    }

    let attendance = await AttendanceRecord.find(attQuery).lean();

    if (role === 'supervisor') {
      const sup = String(requesterSupervisorId || '');
      attendance = attendance.filter(r =>
        String(r.supervisorId || '') === sup ||
        String(r.supervisorId || '') === 'global' ||
        String(r.employeeId || '').startsWith(`${sup}-`) ||
        String(r.employeeId || '').includes(`-${sup}`)
      );
    } else if (supervisorId) {
      const sup = String(supervisorId);
      attendance = attendance.filter(r =>
        String(r.supervisorId || '') === sup ||
        String(r.supervisorId || '') === 'global' ||
        String(r.employeeId || '').startsWith(`${sup}-`) ||
        String(r.employeeId || '').includes(`-${sup}`)
      );
    }

    const supervisorPrefixes = Array.from(new Set(base.map(e => String(e.supervisorId || '')).filter(Boolean)));

    const changedNames = new Set(
      attendance
        .filter(r => String(r.apontador || '').trim() !== '' || String(r.supervisor || '').trim() !== '')
        .map(r => normalizeName(pickCanonicalRecordName(String(r.employeeName || ''), String(r.employeeId || ''), supervisorPrefixes)))
        .filter(Boolean)
    );

    base = base.filter(e => changedNames.has(normalizeName(String(e.name || e.id || ''))));

    // Fallback for legacy mappings: if roster-based set is empty, derive from attendance changed rows.
    if (base.length === 0) {
      const fallback = dedupeByName(
        attendance
          .filter(r => String(r.apontador || '').trim() !== '' || String(r.supervisor || '').trim() !== '')
          .map(r => ({
            id: String(r.employeeId || ''),
            name: pickCanonicalRecordName(String(r.employeeName || ''), String(r.employeeId || ''), supervisorPrefixes),
            supervisorId: String(r.supervisorId || ''),
          }))
          .filter(e => String(e.id || '').trim() !== '')
      );
      // Phase 3: Apply pagination to fallback
      const total = fallback.length;
      const paginated = fallback.slice(skip, skip + pageSize);
      return res.json({
        employees: paginated,
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      });
    }

    // Phase 3: Apply pagination to final result
    const total = base.length;
    const paginated = base.slice(skip, skip + pageSize);
    return res.json({
      employees: paginated,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (e) {
    console.error('Failed to fetch employees', e);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

export default router;
