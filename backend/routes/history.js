const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');

const HISTORY_FILE = path.join(__dirname, '../data/history.json');

function readHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch { return []; }
}
function writeHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

// GET /api/history
router.get('/', optionalAuth, (req, res) => {
  try {
    const { type, limit = 50, page = 1, search } = req.query;
    let history = readHistory();
    if (req.user) history = history.filter(h => h.userId === req.user.id || h.userId === 'guest');
    if (type && type !== 'all') history = history.filter(h => h.type === type);
    if (search) {
      const q = search.toLowerCase();
      history = history.filter(h =>
        h.input?.toLowerCase().includes(q) ||
        h.result?.title?.toLowerCase().includes(q) ||
        h.result?.summary?.toLowerCase().includes(q)
      );
    }
    const total = history.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = history.slice(start, start + parseInt(limit));
    res.json({ history: paginated, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/history/:id
router.get('/:id', optionalAuth, (req, res) => {
  const history = readHistory();
  const item = history.find(h => h.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'History item not found.' });
  res.json({ item });
});

// DELETE /api/history/:id
router.delete('/:id', optionalAuth, (req, res) => {
  let history = readHistory();
  const idx = history.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'History item not found.' });
  history.splice(idx, 1);
  writeHistory(history);
  res.json({ message: 'History item deleted.' });
});

// DELETE /api/history (clear all)
router.delete('/', optionalAuth, (req, res) => {
  writeHistory([]);
  res.json({ message: 'History cleared.' });
});

module.exports = router;
