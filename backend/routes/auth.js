const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const User = require('../models/User');

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
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

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing)
            return res.status(409).json({ error: 'An account with this email already exists.' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({
            id: uuidv4(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c63ff&color=fff&size=128`,
            plan: 'free',
            summaryCount: 0
        });

        await newUser.save();

        const token = generateToken(newUser);
        const { password: _, ...userObj } = newUser.toObject();
        res.status(201).json({ message: 'Account created successfully!', token, user: userObj });

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

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user)
            return res.status(401).json({ error: 'Invalid email or password.' });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid)
            return res.status(401).json({ error: 'Invalid email or password.' });

        const token = generateToken(user);
        const { password: _, ...userObj } = user.toObject();
        res.json({ message: 'Login successful!', token, user: userObj });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const { password: _, ...userObj } = user.toObject();
        res.json({ user: userObj });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const { name, bio, settings } = req.body;
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (name) user.name = name.trim();
        if (bio !== undefined) user.bio = bio;
        if (settings) user.settings = { ...user.settings.toObject(), ...settings };

        await user.save();
        const { password: _, ...userObj } = user.toObject();
        res.json({ message: 'Profile updated successfully!', user: userObj });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
