// Diagnóstico do bug ABT admin → supervisor
// Roda dentro do container attendance-backend: usa MONGODB_URI do env
import mongoose from 'mongoose';

const URI = process.env.MONGODB_URI;
if (!URI) { console.error('MONGODB_URI não definida'); process.exit(1); }

await mongoose.connect(URI);
const db = mongoose.connection.db;

console.log('\n=== 1) Coleções e contagens ===');
for (const name of ['users', 'employees', 'attendancerecords', 'justifications']) {
  const c = await db.collection(name).countDocuments();
  console.log(`  ${name}: ${c}`);
}

console.log('\n=== 2) Supervisors (User.role=supervisor) — id, supervisorId, name ===');
const sups = await db.collection('users').find({ role: 'supervisor' }, { projection: { name:1, supervisorId:1, username:1 } }).toArray();
sups.forEach(u => console.log(`  _id=${u._id}  supervisorId="${u.supervisorId||''}"  username=${u.username}  name=${u.name}`));

console.log('\n=== 3) Distribuição de supervisorId em attendancerecords ===');
const distSup = await db.collection('attendancerecords').aggregate([
  { $group: { _id: '$supervisorId', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray();
distSup.forEach(r => console.log(`  supervisorId="${r._id}"  count=${r.count}`));

console.log('\n=== 4) Registros com supervisor === "ABT" (últimos 20) ===');
const abts = await db.collection('attendancerecords').find({ supervisor: 'ABT' }).sort({ updatedAt: -1 }).limit(20).toArray();
abts.forEach(r => console.log(`  employeeId="${r.employeeId}"  day=${r.day}  supervisorId="${r.supervisorId||''}"  apontador="${r.apontador||''}"  employeeName="${r.employeeName||''}"  updatedAt=${r.updatedAt}`));

console.log('\n=== 5) Para cada ABT, buscar duplicatas (mesmo employeeId+day, supervisorId diferente) ===');
for (const r of abts.slice(0, 10)) {
  const dups = await db.collection('attendancerecords').find({ employeeId: r.employeeId, day: r.day }).toArray();
  if (dups.length > 1) {
    console.log(`  >>> DUPLICATA: employeeId=${r.employeeId} day=${r.day}`);
    dups.forEach(d => console.log(`      _id=${d._id}  supervisorId="${d.supervisorId||''}"  supervisor="${d.supervisor||''}"  apontador="${d.apontador||''}"  updatedAt=${d.updatedAt}`));
  }
}

console.log('\n=== 6) ABTs cujo supervisorId NÃO bate com nenhum User.supervisorId ===');
const validSupIds = new Set(sups.map(s => String(s.supervisorId||'')).filter(Boolean));
validSupIds.add('global');
const orphans = abts.filter(r => !validSupIds.has(String(r.supervisorId||'')));
if (orphans.length === 0) console.log('  (nenhum)');
orphans.forEach(r => console.log(`  ORFAO: employeeId=${r.employeeId} day=${r.day} supervisorId="${r.supervisorId||''}" employeeName="${r.employeeName||''}"`));

console.log('\n=== 7) Audit log dos últimos 10 attendance_update com supervisor=ABT ===');
const audits = await db.collection('auditlogs').find({ action: 'attendance_update', 'details.supervisor': 'ABT' }).sort({ createdAt: -1 }).limit(10).toArray();
audits.forEach(a => console.log(`  ${a.createdAt}  user=${a.userName}(${a.userRole})  emp=${a.details?.employeeName} day=${a.details?.day} supId="${a.details?.supervisorId||''}" empId=${a.details?.employeeId}`));

console.log('\n=== 8) Employees: amostra do campo supervisorId ===');
const empSample = await db.collection('employees').aggregate([
  { $group: { _id: '$supervisorId', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray();
empSample.forEach(r => console.log(`  employees.supervisorId="${r._id}"  count=${r.count}`));

await mongoose.disconnect();
console.log('\n--- fim do diagnóstico ---');
