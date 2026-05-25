require('dotenv').config();

// ─── LangSmith Tracing ────────────────────────────────────────────────────────
if (process.env.LANGSMITH_TRACING === 'true' && process.env.LANGSMITH_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = 'true';
  process.env.LANGCHAIN_ENDPOINT   = process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com';
  process.env.LANGCHAIN_API_KEY    = process.env.LANGSMITH_API_KEY;
  process.env.LANGCHAIN_PROJECT    = process.env.LANGSMITH_PROJECT || 'genai';
  console.log('🔍 LangSmith tracing enabled');
}

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const mongoose = require('mongoose');

const authRoutes     = require('./routes/auth');
const summarizeRoutes = require('./routes/summarize');
const historyRoutes  = require('./routes/history');
const analyticsRoutes = require('./routes/analytics');

const app  = express();
const PORT = process.env.PORT || 5000;
const isVercel = process.env.VERCEL === '1';

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' }
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// ─── Static Files (local dev only) ───────────────────────────────────────────
if (!isVercel) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use(express.static(path.join(__dirname, '../frontend')));
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/summarize', summarizeRoutes);
app.use('/api/history',   historyRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Summarizer API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

// ─── Serve Frontend (local dev only) ─────────────────────────────────────────
if (!isVercel) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  });
}

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection failed:', err.message));

// ─── Start Server (local dev only — Vercel uses module.exports) ───────────────
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
    console.log(`🔐 JWT:        ${process.env.JWT_SECRET    ? '✅' : '❌'}`);
    console.log(`🗄️  MongoDB:   ${process.env.MONGODB_URI   ? '✅' : '❌'}\n`);
  });
}

module.exports = app;
