const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const { summarizeText }        = require('../services/geminiService');
const { extractTextFromPDF }   = require('../services/pdfService');
const { getYouTubeTranscript } = require('../services/youtubeService');
const { extractTextFromURL }   = require('../services/urlService');
const { optionalAuth }         = require('../middleware/auth');
const History                  = require('../models/History');
const User                     = require('../models/User');


// ====================== MULTER CONFIG ======================
// Use memory storage on Vercel (no writable disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.txt', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF, TXT, DOC, DOCX files are allowed.'));
    }
});


// ====================== HELPERS ======================

async function saveToHistory(entry) {
    try {
        await History.create(entry);
    } catch (err) {
        console.error('History save error:', err.message);
    }
}

async function updateUserCount(userId) {
    try {
        await User.findOneAndUpdate({ id: userId }, { $inc: { summaryCount: 1 } });
    } catch (err) {
        console.error('User count update error:', err.message);
    }
}


// ====================== TEXT SUMMARY ======================

router.post('/text', optionalAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim().length < 10)
            return res.status(400).json({ error: 'Please provide at least 10 characters of text.' });

        const result = await summarizeText(text);
        const entry = { id: uuidv4(), type: 'text', userId: req.user?.id || 'guest', input: text.substring(0, 200), result };

        await saveToHistory(entry);
        if (req.user) await updateUserCount(req.user.id);

        res.json({ success: true, result, historyId: entry.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ====================== PDF SUMMARY ======================

router.post('/pdf', optionalAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'Please upload a PDF file.' });

        // Use buffer directly (memory storage — works on Vercel)
        const { extractTextFromBuffer } = require('../services/pdfService');
        const { text, pages, wordCount } = await extractTextFromBuffer(req.file.buffer);

        if (!text || text.trim().length < 20)
            return res.status(400).json({ error: 'Could not extract text from PDF.' });

        const result = await summarizeText(text);
        result.sourceInfo = { pages, wordCount, filename: req.file.originalname };

        const entry = { id: uuidv4(), type: 'pdf', userId: req.user?.id || 'guest', input: req.file.originalname, result };
        await saveToHistory(entry);
        if (req.user) await updateUserCount(req.user.id);

        res.json({ success: true, result, historyId: entry.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ====================== URL SUMMARY ======================

router.post('/url', optionalAuth, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url)
            return res.status(400).json({ error: 'Please provide a URL.' });

        const { text, title, wordCount } = await extractTextFromURL(url);
        const result = await summarizeText(text);
        result.sourceInfo = { url, pageTitle: title, wordCount };

        const entry = { id: uuidv4(), type: 'url', userId: req.user?.id || 'guest', input: url, result };
        await saveToHistory(entry);
        if (req.user) await updateUserCount(req.user.id);

        res.json({ success: true, result, historyId: entry.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ====================== YOUTUBE SUMMARY ======================

router.post('/youtube', optionalAuth, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url)
            return res.status(400).json({ error: 'Please provide a YouTube URL.' });

        const { transcript, videoId, duration, wordCount } = await getYouTubeTranscript(url);
        const result = await summarizeText(transcript);
        result.sourceInfo = {
            videoId, videoUrl: url, duration, wordCount,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };

        const entry = { id: uuidv4(), type: 'youtube', userId: req.user?.id || 'guest', input: url, result };
        await saveToHistory(entry);
        if (req.user) await updateUserCount(req.user.id);

        res.json({ success: true, result, historyId: entry.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ====================== FILE SUMMARY ======================

router.post('/file', optionalAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'Please upload a file.' });

        let text = '';
        const ext = path.extname(req.file.originalname).toLowerCase();

        if (ext === '.txt') {
            text = req.file.buffer.toString('utf8');
        } else if (ext === '.pdf') {
            const { extractTextFromBuffer } = require('../services/pdfService');
            const pdfResult = await extractTextFromBuffer(req.file.buffer);
            text = pdfResult.text;
        } else {
            return res.status(400).json({ error: 'Unsupported file type.' });
        }

        const result = await summarizeText(text);
        result.sourceInfo = { filename: req.file.originalname, wordCount: text.split(/\s+/).length };

        const entry = { id: uuidv4(), type: 'file', userId: req.user?.id || 'guest', input: req.file.originalname, result };
        await saveToHistory(entry);
        if (req.user) await updateUserCount(req.user.id);

        res.json({ success: true, result, historyId: entry.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
