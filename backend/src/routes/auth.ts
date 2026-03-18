import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { authenticateJWT, AuthRequest } from '../middleware/auth.js';
import { Response } from 'express';

const router = Router();

const LOGIN_ALIAS_EMAIL: Record<string, string> = {
  admin: 'admin@attendance.com',
  mariana: 'mariana-moura@attendance.com',
  jose: 'jose-furtado@attendance.com',
  josefurtado: 'jose-furtado@attendance.com',
  paulo: 'paulo-oliveira@attendance.com',
  paulinho: 'paulinho-de-paula@attendance.com',
  rodney: 'rodney-de-macedo@attendance.com',
  expectador: 'expectador@attendance.com',
};

function buildLoginCandidates(identifier: string): string[] {
  const raw = (identifier || '').trim().toLowerCase();
  if (!raw) {
    return [];
  }

  const candidates = new Set<string>();
  candidates.add(raw);

  const localPart = raw.includes('@') ? raw.split('@')[0] : raw;
  const canonical = LOGIN_ALIAS_EMAIL[localPart];
  if (canonical) {
    candidates.add(canonical);
  }

  if (!raw.includes('@')) {
    candidates.add(`${raw}@attendance.com`);
  }

  return [...candidates];
}

// Register
router.post('/register', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Only first user or admin can create new users
    const userCount = await User.countDocuments();
    if (userCount > 0 && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Only admins can register new users' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = new User({
      name,
      email,
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
    const { email, password } = req.body;
    const loginCandidates = buildLoginCandidates(email);
    const users = await User.find({ email: { $in: loginCandidates } });
    const user = users.find((item) => item.isActive !== false) || users[0] || null;

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'User is inactive. Use your canonical account.' });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
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
        email: user.email,
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
        email: user.email,
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
      { email: 'paulinho-de-paula@attendance.com', password: 'paulinho123' },
      { email: 'mariana-moura@attendance.com', password: 'mariana123' },
      { email: 'jose-furtado@attendance.com', password: 'jose123' },
      { email: 'paulo-oliveira@attendance.com', password: 'paulo123' }
    ];

    const results = [];
    for (const update of updates) {
      const hashedPassword = await bcryptjs.hash(update.password, 10);
      const result = await User.findOneAndUpdate(
        { email: update.email },
        { password: hashedPassword },
        { new: true }
      );
      if (result) {
        results.push({ email: result.email, name: result.name, password: update.password });
      }
    }

    res.json({ message: 'Passwords reset successfully', results });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset passwords', error });
  }
});

// TEMPORARY: Reset supervisor passwords
router.post('/admin/reset-supervisor-passwords', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can reset passwords' });
    }

    const updates = [
      { email: 'paulinho-de-paula@attendance.com', password: 'paulinho123' },
      { email: 'mariana-moura@attendance.com', password: 'mariana123' },
      { email: 'jose-furtado@attendance.com', password: 'jose123' },
      { email: 'paulo-oliveira@attendance.com', password: 'paulo123' }
    ];

    const results = [];
    for (const update of updates) {
      const hashedPassword = await bcryptjs.hash(update.password, 10);
      const result = await User.findOneAndUpdate(
        { email: update.email },
        { password: hashedPassword },
        { new: true }
      );
      if (result) {
        results.push({ email: result.email, name: result.name, password: update.password });
      }
    }

    res.json({ message: 'Passwords reset successfully', results });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset passwords', error });
  }
});

export default router;
