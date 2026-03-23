const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const employeeSchema = new mongoose.Schema({
  name: String,
  role: String,
  supervisorUserId: mongoose.Schema.Types.ObjectId,
  department: String,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
});

async function seedEmployees() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-manager';
    console.log('🔗 Connecting to MongoDB:', mongoUri.replace(/:[^:]*@/, ':***@'));
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB for employee seed');

    const User = mongoose.model('User', userSchema, 'users');
    const Employee = mongoose.model('Employee', employeeSchema, 'employees');

    // Check if employees already exist
    const employeeCount = await Employee.countDocuments();
    if (employeeCount > 0) {
      console.log(`✓ Employees already seeded (${employeeCount} found). Skipping.`);
      await mongoose.disconnect();
      return;
    }

    // Find CSV file
    const possiblePaths = [
      '/app/public/Pasta1.csv',
      path.join(__dirname, '../public/Pasta1.csv'),
      path.join(process.cwd(), 'public/Pasta1.csv'),
      '/opt/attendance-manager/frontend/public/Pasta1.csv'
    ];

    let csvPath = '';
    console.log('🔍 Searching for CSV in:');
    for (const p of possiblePaths) {
      console.log(`   - ${p}...`, fs.existsSync(p) ? '✓ FOUND' : '✗ not found');
      if (fs.existsSync(p)) {
        csvPath = p;
        break;
      }
    }

    if (!csvPath) {
      console.warn('⚠ CSV file not found at any path. Skipping employee seed.');
      console.log('   Please ensure Pasta1.csv is in the /app/public/ directory');
      await mongoose.disconnect();
      return;
    }

    console.log(`✓ Using CSV: ${csvPath}`);

    // Get supervisors
    const supervisors = await User.find({ role: 'supervisor' });
    console.log(`✓ Found ${supervisors.length} supervisors`);

    const supervisorMap = {};
    supervisors.forEach(s => {
      if (s.name) {
        supervisorMap[s.name.toUpperCase()] = s._id.toString();
        console.log(`   - ${s.name} (ID: ${s._id})`);
      }
    });

    // Parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1).filter(l => l.trim());

    console.log(`\n📄 CSV has ${lines.length} lines to process`);

    let created = 0;
    const supervisorStats = {};
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const parts = line.split(';');
      if (parts.length < 2) {
        errors.push(`Line ${i + 2}: Invalid format (${line})`);
        continue;
      }

      const supervisorName = (parts[0] || '').trim().toUpperCase();
      const employeeName = (parts[1] || '').trim();
      const role = (parts[2] || 'FUNCIONÁRIO').trim();

      const supervisorId = supervisorMap[supervisorName];
      if (!supervisorId) {
        errors.push(`Line ${i + 2}: Supervisor "${supervisorName}" not found`);
        continue;
      }

      try {
        const employee = new Employee({
          name: employeeName,
          role: role,
          supervisorUserId: supervisorId,
          isActive: true,
          department: supervisorName
        });
        
        await employee.save();
        created++;
        supervisorStats[supervisorName] = (supervisorStats[supervisorName] || 0) + 1;
      } catch (e) {
        errors.push(`Line ${i + 2}: ${e.message}`);
      }
    }

    console.log(`\n✓ EMPLOYEE SEED COMPLETED!`);
    console.log(`  Total created: ${created}`);
    Object.entries(supervisorStats).forEach(([supervisor, count]) => {
      console.log(`  ${supervisor}: ${count} employees`);
    });

    if (errors.length > 0) {
      console.log(`\n⚠ ${errors.length} errors during seed:`);
      errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
      if (errors.length > 5) console.log(`   ... and ${errors.length - 5} more`);
    }

    await mongoose.disconnect();
    console.log('\n✓ MongoDB disconnected. Ready to start application.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ SEED ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedEmployees();
