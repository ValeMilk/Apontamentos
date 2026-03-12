import dns from 'dns';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../src/models/User';

dotenv.config();
try{ dns.setServers(['8.8.8.8','1.1.1.1']); }catch(e){}

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-manager';

interface CSVRow { supervisor: string; employeeName: string; role: string }

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const rows = lines.slice(1).map(line => {
    // support both ; and , delimiters
    const parts = line.split(';');
    if (parts.length < 3) {
      const p2 = line.split(',');
      return { supervisor: (p2[0]||'').trim(), employeeName: (p2[1]||'').trim(), role: (p2[2]||'').trim() };
    }
    return { supervisor: (parts[0]||'').trim(), employeeName: (parts[1]||'').trim(), role: (parts[2]||'').trim() };
  }).filter(r => r.supervisor || r.employeeName);
  return rows;
}

function groupBySupervisor(rows: CSVRow[]) {
  const map: Record<string, { employees: Array<{ name: string; role: string }> }> = {};
  for (const r of rows) {
    if (!map[r.supervisor]) map[r.supervisor] = { employees: [] };
    map[r.supervisor].employees.push({ name: r.employeeName, role: r.role || 'employee' });
  }
  return map;
}

async function run(){
  await mongoose.connect(mongoUri, { family: 4 });
  console.log('Connected to MongoDB');

  const csvPath = path.join(process.cwd(), '..', 'frontend', 'public', 'Pasta1.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at', csvPath);
    await mongoose.disconnect();
    process.exit(1);
  }

  const rows = parseCSV(csvPath);
  const grouped = groupBySupervisor(rows);
  console.log('Supervisors found in CSV:', Object.keys(grouped).length);

  // Ensure Rodney exists
  let rodney = await User.findOne({ name: 'RODNEY DE MACEDO' });
  if (!rodney) {
    const pwd = await bcryptjs.hash('supervisor123', 10);
    rodney = new User({ name: 'RODNEY DE MACEDO', email: 'rodney-de-macedo@attendance.com', password: pwd, role: 'supervisor', supervisorId: 'rodney-de-macedo', isActive: true, employees: [] });
    await rodney.save();
    console.log('Created Rodney');
  }
  const rodneySupervisorId = (rodney as any).supervisorId || rodney._id.toString();

  let created = 0, updated = 0;
  const rodneyEmployeesToAdd: Array<{ name: string; role: string }> = [];

  for (const supName of Object.keys(grouped)) {
    const supIdSlug = supName.toLowerCase().replace(/\s+/g, '-');
    const email = `${supIdSlug}@attendance.com`;
    let sup = await User.findOne({ email });
    if (!sup) {
      const hashed = await bcryptjs.hash('supervisor123', 10);
      sup = new User({ name: supName, email, password: hashed, role: 'supervisor', supervisorId: rodneySupervisorId, isActive: true, employees: grouped[supName].employees });
      await sup.save();
      created++;
      console.log(`Created supervisor: ${supName}`);
    } else {
      // update supervisor: ensure role, supervisorId, employees
      let changed = false;
      if (sup.role !== 'supervisor') { sup.role = 'supervisor'; changed = true; }
      if (sup.supervisorId !== rodneySupervisorId) { sup.supervisorId = rodneySupervisorId; changed = true; }
      // replace employees list with CSV data
      sup.employees = grouped[supName].employees as any;
      sup.markModified('employees');
      changed = true;
      if (changed) { await sup.save(); updated++; console.log(`Updated supervisor: ${supName}`); }
    }
    rodneyEmployeesToAdd.push({ name: supName, role: 'supervisor' });
  }

  // Update Rodney.employees with unique supervisors
  await User.updateOne({ _id: rodney._id }, { $set: { employees: rodneyEmployeesToAdd } });

  const finalRodney = await User.findById(rodney._id).lean();
  console.log(`Done. Created: ${created}, Updated: ${updated}. Rodney employees: ${finalRodney?.employees?.length || 0}`);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
