const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const USERS_FILE = path.join(__dirname, '../data/users.json');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const users = readUsers();
    if (users.find(u => u.email === email.toLowerCase()))
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      id: uuidv4(), name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c63ff&color=fff&size=128`,
      plan: 'free', summaryCount: 0,
      createdAt: new Date().toISOString(),
      settings: { defaultLength: 'medium', defaultFormat: 'paragraph', defaultTone: 'formal', language: 'English', theme: 'dark' }
    };
    users.push(newUser);
    writeUsers(users);

    const token = generateToken(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'Account created successfully!', token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const users = readUsers();
    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful!', token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { name, bio, settings } = req.body;
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found.' });

    if (name) users[idx].name = name.trim();
    if (bio !== undefined) users[idx].bio = bio;
    if (settings) users[idx].settings = { ...users[idx].settings, ...settings };
    users[idx].updatedAt = new Date().toISOString();
    writeUsers(users);

    const { password: _, ...userWithoutPassword } = users[idx];
    res.json({ message: 'Profile updated successfully!', user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
