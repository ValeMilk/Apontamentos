import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';
import { Response } from 'express';

const router = Router();

// Public: list active users for login dropdown (no passwords exposed)
router.get('/login-users', async (_req, res: Response) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name username role')
      .sort({ role: 1, name: 1 })
      .lean();

    const ROLE_ORDER: Record<string, number> = { admin: 0, gerente: 1, supervisor: 2, expectador: 3 };
    const ROLE_LABELS: Record<string, string> = { admin: 'Admin', gerente: 'Gerente', supervisor: 'Supervisor', expectador: 'Expectador' };

    const result = users
      .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
      .map(u => ({
        label: u.role !== 'supervisor' ? `${u.name} (${ROLE_LABELS[u.role] || u.role})` : u.name,
        value: u.username,
      }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Register
router.post('/register', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { name, username, password, role } = req.body;

    // Check if user exists
    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Only first user or admin can create new users
    const userCount = await User.countDocuments();
    if (userCount > 0 && (!req.user || (req.user.role !== 'admin' && req.user.role !== 'gerente'))) {
      return res.status(403).json({ message: 'Only admins can register new users' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = new User({
      name,
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      role: role || 'expectador',
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error });
  }
});

// Login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    const normalizedUsername = (username || '').trim().toLowerCase();

    if (!normalizedUsername) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = await User.findOne({ username: normalizedUsername, isActive: true });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        supervisorId: user.supervisorId,
      },
      process.env.JWT_SECRET || 'your_secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
      { expiresIn: '7d' }
    );

    // Store refresh token in DB (hashed)
    const hashedRefreshToken = await bcryptjs.hash(refreshToken, 10);
    const rtRecord = new RefreshToken({
      userId: user._id,
      token: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await rtRecord.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        supervisorId: user.supervisorId,
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your_refresh_secret'
    ) as any;

    const rtRecord = await RefreshToken.findOne({ userId: decoded.userId });
    if (!rtRecord) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const isMatch = await bcryptjs.compare(refreshToken, rtRecord.token);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const newAccessToken = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        supervisorId: user.supervisorId,
      },
      process.env.JWT_SECRET || 'your_secret',
      { expiresIn: '15m' }
    );

    // Optionally rotate refresh token
    const newRefreshToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
      { expiresIn: '7d' }
    );

    const hashedNewRefreshToken = await bcryptjs.hash(newRefreshToken, 10);
    await RefreshToken.deleteOne({ _id: rtRecord._id });
    const newRtRecord = new RefreshToken({
      userId: user._id,
      token: hashedNewRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await newRtRecord.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: 'Token refresh failed', error });
  }
});

// Logout
router.post('/logout', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userId) {
      await RefreshToken.deleteMany({ userId: req.userId });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed', error });
  }
});

// Profile
router.get('/profile', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile', error });
  }
});

// TEMPORARY DEBUG: Reset supervisor passwords (unprotected endpoint)
router.post('/debug/reset-passwords', async (req: AuthRequest, res: Response) => {
  try {
    const updates = [
      { username: 'paulinho de paula', password: 'paulinho123' },
      { username: 'mariana moura', password: 'mariana123' },
      { username: 'jose furtado', password: 'jose123' },
      { username: 'paulo oliveira', password: 'paulo123' }
    ];

    const results = [];
    for (const update of updates) {
      const hashedPassword = await bcryptjs.hash(update.password, 10);
      const result = await User.findOneAndUpdate(
        { username: update.username },
        { password: hashedPassword },
        { new: true }
      );
      if (result) {
        results.push({ username: result.username, name: result.name, password: update.password });
      }
    }

    res.json({ message: 'Passwords reset successfully', results });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset passwords', error });
  }
});

// TEMPORARY DEBUG: Populate employees from CSV
router.post('/debug/populate-employees', async (req: AuthRequest, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Ler CSV - tentar múltiplos caminhos
    let csvPath = '';
    const possiblePaths = [
      '/app/public/Pasta1.csv',
      '/opt/attendance-manager/frontend/public/Pasta1.csv',
      path.join(process.cwd(), '../', 'frontend', 'public', 'Pasta1.csv'),
      path.join(process.cwd(), '../../frontend/public/Pasta1.csv'),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        csvPath = p;
        break;
      }
    }
    
    if (!csvPath) {
      return res.status(404).json({ 
        message: 'CSV file not found',
        cwd: process.cwd(),
        tried: possiblePaths 
      });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header

    // Map supervisors
    const supervisors = await User.find({ role: 'supervisor' });
    const supervisorMap: Record<string, string> = {};
    supervisors.forEach(s => {
      supervisorMap[s.name.toUpperCase()] = s._id.toString();
    });

    console.log(`Found ${Object.keys(supervisorMap).length} supervisors`);

    // Create employees collection if not exists
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
    const deleteResult = await (Employee.collection as any).deleteMany({});

    // Parse and add employees
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
      } catch (e) {
        console.error('Error creating employee:', e);
      }
    }

    const total = await (Employee.collection as any).countDocuments();

    res.json({
      message: 'Employees populated successfully',
      created,
      total,
      supervisorMapSize: Object.keys(supervisorMap).length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to populate employees', error });
  }
});

// TEMPORARY DEBUG: Add employees via JSON POST
router.post('/debug/add-employees', async (req: AuthRequest, res: Response) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees)) {
      return res.status(400).json({ message: 'Expected array of employees' });
    }

    // Get supervisors map
    const supervisors = await User.find({ role: 'supervisor' });
    const supervisorMap: Record<string, string> = {};
    supervisors.forEach(s => {
      supervisorMap[s.name.toUpperCase()] = s._id.toString();
    });

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
    await (Employee.collection as any).deleteMany({});

    // Add employees
    let created = 0;
    for (const emp of employees) {
      const supervisorId = supervisorMap[emp.supervisorName?.toUpperCase()];
      if (!supervisorId) continue;

      try {
        await Employee.create({
          name: emp.name,
          role: emp.role || 'FUNCIONÁRIO',
          supervisorUserId: supervisorId,
          isActive: true,
          department: emp.supervisorName
        });
        created++;
      } catch (e) {
        console.error('Error:', e);
      }
    }

    const total = await (Employee.collection as any).countDocuments();

    res.json({
      message: 'Employees added successfully',
      created,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add employees', error });
  }
});

// TEMPORARY: Reset supervisor passwords
router.post('/admin/reset-supervisor-passwords', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reset passwords' });
    }

    const updates = [
      { username: 'paulinho de paula', password: 'paulinho123' },
      { username: 'mariana moura', password: 'mariana123' },
      { username: 'jose furtado', password: 'jose123' },
      { username: 'paulo oliveira', password: 'paulo123' }
    ];

    const results = [];
    for (const update of updates) {
      const hashedPassword = await bcryptjs.hash(update.password, 10);
      const result = await User.findOneAndUpdate(
        { username: update.username },
        { password: hashedPassword },
        { new: true }
      );
      if (result) {
        results.push({ username: result.username, name: result.name, password: update.password });
      }
    }

    res.json({ message: 'Passwords reset successfully', results });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset passwords', error });
  }
});

// TEMPORARY DEBUG: Quick populate employees
router.post('/debug/quick-populate', async (req: AuthRequest, res: Response) => {
  try {
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
    const supervisors = await User.find({ role: 'supervisor' });

    // Delete existing
    await Employee.deleteMany({});

    // Create sample employees for each supervisor (3 each)
    let total = 0;
    for (const sup of supervisors) {
      for (let i = 1; i <= 3; i++) {
        await Employee.create({
          name: `FUNC${sup._id.toString().slice(-3).toUpperCase()}-${i}`,
          role: 'PROMOTOR (A)',
          supervisorUserId: sup._id,
          department: sup.name,
          isActive: true
        });
        total++;
      }
    }

    res.json({
      message: 'Quick population completed',
      total,
      supervisorCount: supervisors.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to quick populate', error });
  }
});

export default router;
