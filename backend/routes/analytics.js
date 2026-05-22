const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');

const HISTORY_FILE = path.join(__dirname, '../data/history.json');

function readHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
}

// GET /api/analytics
router.get('/', optionalAuth, (req, res) => {
  try {
    const history = readHistory();
    const total = history.length;
    const byType = history.reduce((acc, h) => { acc[h.type] = (acc[h.type] || 0) + 1; return acc; }, {});
    const bySentiment = history.reduce((acc, h) => {
      const s = h.result?.sentiment || 'neutral';
      acc[s] = (acc[s] || 0) + 1; return acc;
    }, {});

    // Daily usage (last 30 days)
    const now = new Date();
    const dailyUsage = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyUsage[key] = 0;
    }
    history.forEach(h => {
      const key = h.createdAt?.split('T')[0];
      if (key && dailyUsage.hasOwnProperty(key)) dailyUsage[key]++;
    });

    const totalWords = history.reduce((sum, h) => sum + (h.result?.wordCount || 0), 0);
    const avgWords = total > 0 ? Math.round(totalWords / total) : 0;
    const tags = history.flatMap(h => h.result?.tags || []);
    const tagFreq = tags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));

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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
