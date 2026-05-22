const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id:           { type: String, required: true, unique: true },
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true, lowercase: true },
    password:     { type: String, required: true },
    avatar:       { type: String },
    plan:         { type: String, default: 'free' },
    summaryCount: { type: Number, default: 0 },
    bio:          { type: String, default: '' },
    settings: {
        defaultLength: { type: String, default: 'medium' },
        defaultFormat: { type: String, default: 'paragraph' },
        defaultTone:   { type: String, default: 'formal' },
        language:      { type: String, default: 'English' },
        theme:         { type: String, default: 'dark' }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
