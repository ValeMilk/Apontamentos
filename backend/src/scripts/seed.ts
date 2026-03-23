import dns from 'dns';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

// Load environment variables from .env file
dotenv.config();

// TypeScript interfaces
interface CSVRow {
  supervisor: string;
  employeeName: string;
  role: string;
}

interface SupervisorData {
  [key: string]: {
    employees: Array<{ name: string; role: string }>;
  };
}

// Parse CSV file
function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  // Skip header
  const rows = lines.slice(1).map((line) => {
    const [supervisor, employeeName, role] = line.split(';').map((s) => s.trim());
    return { supervisor, employeeName, role };
  });

  return rows;
}

// Group employees by supervisor
function groupBySupervisor(rows: CSVRow[]): SupervisorData {
  const grouped: SupervisorData = {};

  rows.forEach((row) => {
    if (!grouped[row.supervisor]) {
      grouped[row.supervisor] = { employees: [] };
    }
    grouped[row.supervisor].employees.push({
      name: row.employeeName,
      role: row.role,
    });
  });

  return grouped;
}

async function seed() {
  try {
    try{
      dns.setServers(['8.8.8.8','1.1.1.1']);
      console.log('🔧 DNS servers ajustados para: 8.8.8.8, 1.1.1.1');
    }catch(e){ console.warn('⚠️ Não foi possível setar DNS servers:', e); }
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-manager';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('Admin already exists. Skipping seed.');
      await mongoose.disconnect();
      return;
    }

    // Create admin
    const hashedPassword = await bcryptjs.hash('admin', 10);
    const admin = new User({
      name: 'Administrador',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });
    await admin.save();
    console.log('✓ Admin created: admin / admin');

    // Read and parse CSV - try multiple possible locations
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'Pasta1.csv'),
      path.join(process.cwd(), 'Pasta1.csv'),
      path.join(process.cwd(), '..', 'frontend', 'public', 'Pasta1.csv'),
    ];
    const csvPath = possiblePaths.find((p) => fs.existsSync(p));

    if (!csvPath) {
      console.warn(`⚠ CSV file not found. Tried: ${possiblePaths.join(', ')}. Skipping supervisor seed.`);
      await mongoose.disconnect();
      return;
    }

    const rows = parseCSV(csvPath);
    const supervisorData = groupBySupervisor(rows);

    console.log(`\nParsed ${Object.keys(supervisorData).length} supervisors from CSV:`);

    // Adicionar Rodney como supervisor (gerente dos supervisores)
    const rodneyExists = await User.findOne({
      username: 'rodney',
      role: 'supervisor',
    });

    if (!rodneyExists) {
      const rodneyPwd = await bcryptjs.hash('supervisor123', 10);
      const rodney = new User({
        name: 'RODNEY',
        username: 'rodney',
        password: rodneyPwd,
        role: 'supervisor',
        supervisorId: 'rodney',
        isActive: true,
        employees: [], // Rodney é gerente dos supervisores, sem funcionários próprios
      });
      await rodney.save();
      console.log(`  ✓ "RODNEY" (Gerente - 0 employees) | login: rodney`);
    }

    // Create supervisor users (todos reportam ao Rodney)
    const rodneyEmployees: Array<{ name: string; role: string }> = [];

    for (const supervisorName of Object.keys(supervisorData)) {
      // Gerar username a partir do nome do supervisor (ex: "MARIANA MOURA" -> "mariana moura")
      const username = supervisorName.trim().toLowerCase();
      const supervisorId = supervisorName.toLowerCase().replace(/\s+/g, '-');

      const existingSupervisor = await User.findOne({
        username: username,
        role: 'supervisor',
      });

      if (existingSupervisor) {
        console.log(`  ℹ Supervisor "${supervisorName}" already exists. Skipping.`);
        continue;
      }

      const hashedPwd = await bcryptjs.hash('supervisor123', 10);

      const supervisor = new User({
        name: supervisorName,
        username: username,
        password: hashedPwd,
        role: 'supervisor',
        supervisorId: 'rodney', // Todos reportam ao Rodney
        isActive: true,
        employees: supervisorData[supervisorName].employees,
      });

      await supervisor.save();
      console.log(
        `  ✓ "${supervisorName}" (${supervisorData[supervisorName].employees.length} employees) | login: ${username}`
      );

      // Adicionar ao array de employees do Rodney
      rodneyEmployees.push({ name: supervisorName, role: 'supervisor' });
    }

    // Atualizar Rodney com a lista de supervisores como employees
    if (rodneyEmployees.length > 0) {
      await User.updateOne(
        { username: 'rodney', role: 'supervisor' },
        { $set: { employees: rodneyEmployees } }
      );
      console.log(`  ✓ Rodney atualizado com ${rodneyEmployees.length} supervisores como equipe`);
    }

    console.log('\n✓ Seed completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
