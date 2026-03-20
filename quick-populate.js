const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const csvContent = `SUPEVISOR;FUNCIONÁRIOS;FUNÇÃO
MARIANA MOURA;MAX FELIX MONTEIRO;PROMOTOR (A)
MARIANA MOURA;FRANCISCA NALDIANA DA SILVA OLIVEIRA;DEGUSTADORA (A)
PAULO OLIVEIRA;JOAO SILVA;PROMOTOR (A)
PAULO OLIVEIRA;ANDRE SANTOS;PROMOTOR (A)
JOSE FURTADO;CARLOS OLIVEIRA;PROMOTOR (A)
JOSE FURTADO;MARIA SILVA;DEGUSTADORA (A)
PAULINHO DE PAULA;PEDRO COSTA;PROMOTOR (A)
PAULINHO DE PAULA;ANA SOUZA;PROMOTOR (A)`;

async function populate() {
  try {
    console.log('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado\n');

    // Parse CSV
    const lines = csvContent.split('\n').slice(1);
    
    // Get supervisors
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String
    });
    const User = mongoose.model('User', userSchema, 'users');
    
    const supervisors = await User.find({ role: 'supervisor' });
    const supervisorMap = {};
    supervisors.forEach(s => {
      supervisorMap[s.name.toUpperCase()] = s._id.toString();
    });
    
    console.log(`✓ ${supervisors.length} supervisores encontrados\n`);

    // Create employee schema
    const employeeSchema = new mongoose.Schema({
      name: String,
      role: String,
      supervisorUserId: mongoose.Schema.Types.ObjectId,
      department: String,
      isActive: Boolean,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const Employee = mongoose.model('Employee', employeeSchema, 'employees');

    // Delete existing
    await Employee.deleteMany({});

    // Parse and insert
    let count = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(';');
      const supName = (parts[0] || '').trim().toUpperCase();
      const empName = (parts[1] || '').trim();
      const empRole = (parts[2] || 'FUNCIONÁRIO').trim();

      const supId = supervisorMap[supName];
      if (!supId) {
        console.log(`⚠ Supervisor não encontrado: ${supName}`);
        continue;
      }

      await Employee.create({
        name: empName,
        role: empRole,
        supervisorUserId: supId,
        department: supName,
        isActive: true
      });
      count++;
    }

    console.log(`✓ ${count} funcionários criados!\n`);

    const total = await Employee.countDocuments();
    console.log(`✓ Total no banco: ${total}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('ERRO:', err.message);
    process.exit(1);
  }
}

populate();
