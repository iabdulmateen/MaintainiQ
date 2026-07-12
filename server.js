import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import initSqlJs from 'sql.js';
import fs from 'fs';
import nodemailer from 'nodemailer';
import util from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3001;
const dbPath = path.join(__dirname, 'app.db');
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';
const appUrl = (process.env.APP_URL || process.env.LOCALTUNNEL_URL || 'https://sour-taxis-itch.loca.lt').replace(/\/$/, '');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/public/:assetCode', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let db;
let SQL;

async function initDatabaseLayer() {
  SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file)
  });

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
  }
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  return result;
}

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

async function initDatabase() {
  await initDatabaseLayer();
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'reporter',
      created_at TEXT NOT NULL,
      last_login TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      used_at TEXT,
      created_by TEXT
    )
  `);

  // Keep the bootstrap admin as the real system administrator.
  // Demo persona toggles in the frontend are UI-only and do not replace database-backed auth.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@maintainiq.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!';
  const existingAdmin = await getOne('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await run(
      'INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)',
      [adminEmail, hash, 'admin', new Date().toISOString()]
    );
    console.log(`Bootstrap admin created: ${adminEmail}`);
  }
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }

  const cookieHeader = req.headers.cookie || '';
  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((entry) => {
      const [key, ...valueParts] = entry.trim().split('=');
      return [key, decodeURIComponent(valueParts.join('='))];
    })
  );

  return cookies.maintainiq_token || null;
}

function authenticateToken(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await getOne('SELECT id, email, role FROM users WHERE id = ?', [decoded.userId]);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied for this role' });
    }
    next();
  };
}

async function sendInvitationEmail(email, token, role) {
  const host = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'no-reply@maintainiq.local';

  if (!host || !user || !pass || host.includes('example')) {
    return { sent: false, reason: 'SMTP not configured. Invitation link generated locally.' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass }
  });

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: 'You are invited to MaintainIQ',
    html: `<p>Hello,</p><p>You have been invited as a <strong>${role}</strong> to MaintainIQ.</p><p>Use the link below to activate your account:</p><p><a href="${appUrl}/register?token=${token}">Create your account</a></p>`
  });

  return { sent: true, messageId: info.messageId };
}

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', error: null, success: null });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await getOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), user.id]);

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '8h' });
  res.cookie('maintainiq_token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/api/auth/signup', (req, res) => {
  res.status(403).json({ error: 'Public signup is disabled. Please use an invitation link.' });
});

app.get('/register', async (req, res) => {
  const token = req.query.token || '';
  if (!token) {
    return res.render('register', { title: 'Create Account', token: '', email: null, error: 'Invitation token is required.', success: null });
  }

  try {
    const invitation = getOne('SELECT * FROM invitations WHERE token = ? AND status = ? AND expires_at > ?', [token, 'pending', new Date().toISOString()]);
    if (!invitation) {
      return res.render('register', { title: 'Create Account', token: '', email: null, error: 'Invitation token is invalid or expired.', success: null });
    }

    return res.render('register', { title: 'Create Account', token, email: invitation.email, error: null, success: null });
  } catch (err) {
    console.error('Error loading invitation for register page', err);
    return res.render('register', { title: 'Create Account', token: '', email: null, error: 'Server error while validating token.', success: null });
  }
});

app.post('/register', async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token) {
    return res.render('register', { title: 'Create Account', token: '', error: 'Invitation token is required.', success: null });
  }
  if (!password || password.length < 8) {
    return res.render('register', { title: 'Create Account', token, error: 'Password must be at least 8 characters long.', success: null });
  }
  if (password !== confirmPassword) {
    return res.render('register', { title: 'Create Account', token, error: 'Passwords do not match.', success: null });
  }

  const invitation = await getOne('SELECT * FROM invitations WHERE token = ? AND status = ? AND expires_at > ?', [token, 'pending', new Date().toISOString()]);
  if (!invitation) {
    return res.render('register', { title: 'Create Account', token, error: 'Invitation token is invalid or expired.', success: null });
  }

  const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [invitation.email]);
  if (existingUser) {
    return res.render('register', { title: 'Create Account', token, error: 'An account already exists for this email.', success: null });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await run('INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)', [invitation.email, passwordHash, invitation.role, new Date().toISOString()]);
  await run('UPDATE invitations SET status = ?, used_at = ? WHERE id = ?', ['used', new Date().toISOString(), invitation.id]);

  res.render('register', { title: 'Create Account', token: '', error: null, success: 'Account created successfully. You can now log in.' });
});

app.get('/dashboard', authenticateToken, async (req, res) => {
  const user = await getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.render('dashboard', { user, title: 'Dashboard' });
});

app.get('/admin', authenticateToken, requireRole('admin'), async (req, res) => {
  const users = await getAll('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
  const invitations = await getAll('SELECT * FROM invitations ORDER BY created_at DESC LIMIT 20');
  res.render('admin', { title: 'Admin Panel', users, invitations, error: null, success: null });
});

app.post('/api/admin/invitations', authenticateToken, requireRole('admin'), async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }
  if (!['technician', 'reporter'].includes(role)) {
    return res.status(400).json({ error: 'Role must be technician or reporter' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await run(
    'INSERT INTO invitations (email, role, token, expires_at, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [email.toLowerCase(), role, token, expiresAt, new Date().toISOString(), req.user.email]
  );

  const emailResult = await sendInvitationEmail(email.toLowerCase(), token, role);
  res.json({
    message: 'Invitation created successfully',
    token,
    emailResult,
    inviteUrl: `${appUrl}/register?token=${token}`
  });
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  const user = await getOne('SELECT id, email, role, created_at, last_login FROM users WHERE id = ?', [req.user.id]);
  res.json({ user });
});

app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  const users = await getAll('SELECT id, email, role, created_at, last_login FROM users ORDER BY created_at DESC');
  res.json({ users });
});

app.get('/api/technician/dashboard', authenticateToken, requireRole('technician'), (req, res) => {
  res.json({ message: 'Technician dashboard access granted', role: req.user.role, user: req.user });
});

app.get('/api/reporter/dashboard', authenticateToken, requireRole('reporter'), (req, res) => {
  res.json({ message: 'Reporter dashboard access granted', role: req.user.role, user: req.user });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

await initDatabase();

function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    console.log(`Server running on ${appUrl}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && portToUse === port) {
      console.log(`Port ${portToUse} is busy, trying ${appUrl}:${portToUse + 1}`);
      startServer(portToUse + 1);
      return;
    }

    throw error;
  });
}

startServer(port);
