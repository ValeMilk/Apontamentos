import mongoose from 'mongoose';
const URI = process.env.MONGODB_URI;
await mongoose.connect(URI);
const db = mongoose.connection.db;

console.log('\n=== Users com array employees: contagem por user ===');
const users = await db.collection('users').find({ role: { $in: ['supervisor','gerente'] } }).toArray();
for (const u of users) {
  const emps = Array.isArray(u.employees) ? u.employees : [];
  console.log(`\n  ${u.name} (_id=${u._id}, supervisorId="${u.supervisorId||''}", role=${u.role})  -> ${emps.length} employees`);
  emps.slice(0,5).forEach(e => console.log(`     - name="${e.name}" role="${e.role||''}"`));
  if (emps.length > 5) console.log(`     ... +${emps.length-5}`);
}

console.log('\n=== Procurando MARIA VANESSA em algum user.employees ===');
for (const u of users) {
  const emps = Array.isArray(u.employees) ? u.employees : [];
  const found = emps.find(e => String(e.name||'').toUpperCase().includes('MARIA VANESSA'));
  if (found) console.log(`  Encontrada em: ${u.name} (supervisorId="${u.supervisorId||''}")`);
}

console.log('\n=== AttendanceRecord MARIA VANESSA todos os dias ===');
const recs = await db.collection('attendancerecords').find({ employeeId: 'rodney-maria-vanessa' }).sort({day:1}).toArray();
recs.forEach(r => console.log(`  day=${r.day} apontador="${r.apontador}" supervisor="${r.supervisor}" supervisorId="${r.supervisorId}"`));

await mongoose.disconnect();
