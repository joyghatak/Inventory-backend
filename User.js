const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }, // Store secure hash
    role: { type: String, enum: ['admin', 'user'], default: 'admin' }
});

module.exports = mongoose.model('User', UserSchema);