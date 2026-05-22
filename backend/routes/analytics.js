const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const History = require('../models/History');

// GET /api/analytics
router.get('/', optionalAuth, async (req, res) => {
    try {
        const query = req.user ? { userId: req.user.id } : {};

        const history = await History.find(query).lean();
        const total = history.length;

        // Count by type
        const byType = history.reduce((acc, h) => {
            acc[h.type] = (acc[h.type] || 0) + 1;
            return acc;
        }, {});

        // Count by sentiment
        const bySentiment = history.reduce((acc, h) => {
            const s = h.result?.sentiment || 'neutral';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});

        // Daily usage — last 30 days
        const now = new Date();
        const dailyUsage = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dailyUsage[d.toISOString().split('T')[0]] = 0;
        }
        history.forEach(h => {
            const key = new Date(h.createdAt).toISOString().split('T')[0];
            if (dailyUsage.hasOwnProperty(key)) dailyUsage[key]++;
        });

        // Word stats
        const totalWords = history.reduce((sum, h) => sum + (h.result?.wordCount || 0), 0);
        const avgWords   = total > 0 ? Math.round(totalWords / total) : 0;

        // Top tags
        const tags    = history.flatMap(h => h.result?.tags || []);
        const tagFreq = tags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
        const topTags = Object.entries(tagFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));

        res.json({
            total,
            byType,
            bySentiment,
            dailyUsage: Object.entries(dailyUsage).map(([date, count]) => ({ date, count })),
            totalWords,
            avgWords,
            topTags,
            recentActivity: history.slice(0, 5)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
