import mongoose from 'mongoose';
const URI = process.env.MONGODB_URI;
await mongoose.connect(URI);
const db = mongoose.connection.db;

console.log('\n=== ÚLTIMOS 30 audit logs attendance_update (qualquer status) ===');
const recent = await db.collection('auditlogs').find({ action: 'attendance_update' })
  .sort({ createdAt: -1 }).limit(30).toArray();
recent.forEach(a => console.log(`  ${a.createdAt.toISOString()}  user=${a.userName}(${a.userRole})  emp=${a.details?.employeeName} day=${a.details?.day} sup="${a.details?.supervisor||''}" supId="${a.details?.supervisorId||''}" empId=${a.details?.employeeId}`));

console.log('\n=== Funcionários do José Furtado (do user.employees) ===');
const jose = await db.collection('users').findOne({ username: 'jose furtado' });
const empsJose = (jose?.employees || []).map(e => e.name);
empsJose.forEach(n => console.log(`  - ${n}`));

console.log('\n=== Para cada funcionário do José, listar TODOS os AttendanceRecord (qualquer dia, qualquer status) ===');
function slug(s){return String(s||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');}
for (const name of empsJose) {
  const empId = `rodney-${slug(name)}`;
  const recs = await db.collection('attendancerecords').find({ employeeId: empId }).sort({day:-1}).limit(5).toArray();
  console.log(`\n  ${name} (${empId})  -> ${recs.length} reg recentes`);
  recs.forEach(r => console.log(`    day=${r.day} apontador="${r.apontador}" supervisor="${r.supervisor}" supId="${r.supervisorId}" updatedAt=${r.updatedAt?.toISOString?.()||r.updatedAt}`));
}

console.log('\n=== Procurando QUALQUER record com supervisor=ABT criado/atualizado nos últimos 3 dias ===');
const since = new Date(Date.now() - 3*24*3600*1000);
const lateAbts = await db.collection('attendancerecords').find({ supervisor: 'ABT', updatedAt: { $gte: since } }).toArray();
console.log(`  total: ${lateAbts.length}`);
lateAbts.forEach(r => console.log(`  empId=${r.employeeId} day=${r.day} supId="${r.supervisorId}" updatedAt=${r.updatedAt?.toISOString?.()}`));

console.log('\n=== Justificativas com código ABT recentes ===');
const lateJusts = await db.collection('justifications').find({}).sort({ createdAt: -1 }).limit(15).toArray();
lateJusts.forEach(j => console.log(`  ${j.createdAt?.toISOString?.()}  empId=${j.employeeId} day=${j.day} text="${(j.text||'').slice(0,60)}"`));

await mongoose.disconnect();
