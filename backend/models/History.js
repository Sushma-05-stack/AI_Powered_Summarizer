const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    id:        { type: String, required: true, unique: true },
    type:      { type: String, enum: ['text', 'pdf', 'url', 'youtube', 'file'], required: true },
    userId:    { type: String, default: 'guest' },
    input:     { type: String },
    result:    { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// Index for fast user queries
historySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('History', historySchema);
