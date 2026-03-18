const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');

// Connection string - pode ser colocado como env var
const mongoUri = 'mongodb+srv://miqueiascirino_db_user:valemilk123456789@dbvale.chv7pdf.mongodb.net/?appName=dbvale';

const employeeSchema = new mongoose.Schema({
  name: String,
  role: String,
  supervisorUserId: mongoose.Schema.Types.ObjectId,
  department: String,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'employees' });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, { collection: 'users' });

const Employee = mongoose.model('Employee', employeeSchema);
const User = mongoose.model('User', userSchema);

async function populateEmployees() {
  try {
    console.log('Conectando ao MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Conectado\n');

    // Ler CSV
    const csvPath = path.join(__dirname, 'frontend', 'public', 'Pasta1.csv');
    if (!fs.existsSync(csvPath)) {
      console.log('✗ CSV não encontrado em: ' + csvPath);
      process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header

    // Map supervisors
    const supervisors = await User.find({ role: 'supervisor' });
    const supervisorMap = {};
    supervisors.forEach(s => {
      supervisorMap[s.name.toUpperCase()] = s._id;
    });

    console.log(`Encontrados ${Object.keys(supervisorMap).length} supervisores\n`);

    // Delete existing
    const deleteResult = await Employee.deleteMany({});
    console.log(`✓ Deletados ${deleteResult.deletedCount} funcionários antigos\n`);

    // Create employees
    let created = 0;
    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(';');
      if (parts.length < 2) continue;

      const supervisorName = (parts[0] || '').trim().toUpperCase();
      const employeeName = (parts[1] || '').trim();
      const role = (parts[2] || 'FUNCIONÁRIO').trim();

      const supervisorId = supervisorMap[supervisorName];
      if (!supervisorId) continue;

      try {
        await Employee.create({
          name: employeeName,
          role: role,
          supervisorUserId: supervisorId,
          isActive: true,
          department: supervisorName
        });
        created++;
        if (created % 10 === 0) {
          process.stdout.write('.');
        }
      } catch (e) {
        // Ignore duplicates
      }
    }

    console.log('\n\n✓ ' + created + ' funcionários criados com sucesso!\n');

    const total = await Employee.countDocuments();
    console.log(`✓ Total de funcionários no banco: ${total}\n`);

    // List by supervisor
    const bySuper = {};
    for (const [name, id] of Object.entries(supervisorMap)) {
      const count = await Employee.countDocuments({ supervisorUserId: id });
      bySuper[name] = count;
    }

    console.log('=== POR SUPERVISOR ===');
    Object.entries(bySuper).forEach(([name, count]) => {
      console.log(`${name}: ${count} funcionários`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Feito!');
  } catch (err) {
    console.error('ERRO:', err.message);
    process.exit(1);
  }
}

populateEmployees();
