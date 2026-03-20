import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

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
      '/opt/attendance-manager/frontend/public/Pasta1.csv',
      path.join(process.cwd(), '../frontend/public/Pasta1.csv'),
      path.join(process.cwd(), '../../frontend/public/Pasta1.csv')
    ];

    let csvPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        csvPath = p;
        console.log(`✓ Found CSV at: ${csvPath}`);
        break;
      }
    }

    if (!csvPath) {
      console.warn('⚠ CSV file not found. Skipping employee seed.');
      await mongoose.disconnect();
      return;
    }

    // Get supervisors
    const supervisors = await User.find({ role: 'supervisor' });
    const supervisorMap: Record<string, string> = {};
    supervisors.forEach(s => {
      supervisorMap[s.name.toUpperCase()] = s._id.toString();
    });

    console.log(`✓ Found ${supervisors.length} supervisors`);

    // Parse and seed employees
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header

    let created = 0;
    const supervisorStats: Record<string, number> = {};

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
        supervisorStats[supervisorName] = (supervisorStats[supervisorName] || 0) + 1;
      } catch (e) {
        console.error('Error creating employee:', (e as any).message);
      }
    }

    console.log(`\n✓ EMPLOYEE SEED COMPLETED!`);
    console.log(`  Total created: ${created}`);
    Object.entries(supervisorStats).forEach(([supervisor, count]) => {
      console.log(`  ${supervisor}: ${count} employees`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('SEED ERROR:', error);
    process.exit(1);
  }
}

seedEmployees();
