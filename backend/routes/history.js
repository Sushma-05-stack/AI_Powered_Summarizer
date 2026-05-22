const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const History = require('../models/History');

// GET /api/history
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { type, limit = 50, page = 1, search } = req.query;

        const query = {};
        if (req.user) {
            query.userId = req.user.id;
        }
        if (type && type !== 'all') {
            query.type = type;
        }
        if (search) {
            const q = new RegExp(search, 'i');
            query.$or = [{ input: q }, { 'result.summary': q }, { 'result.title': q }];
        }

        const total = await History.countDocuments(query);
        const history = await History.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        res.json({
            history,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/history/:id
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const item = await History.findOne({ id: req.params.id }).lean();
        if (!item) return res.status(404).json({ error: 'History item not found.' });
        res.json({ item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/history/:id
router.delete('/:id', optionalAuth, async (req, res) => {
    try {
        const result = await History.findOneAndDelete({ id: req.params.id });
        if (!result) return res.status(404).json({ error: 'History item not found.' });
        res.json({ message: 'History item deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/history (clear all for user)
router.delete('/', optionalAuth, async (req, res) => {
    try {
        const query = req.user ? { userId: req.user.id } : { userId: 'guest' };
        await History.deleteMany(query);
        res.json({ message: 'History cleared.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
