// backend/models/Subscriber.js
const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email:  { type: String, required: true, unique: true, trim: true, lowercase: true },
  status: { type: String, enum: ['Active', 'Unsubscribed'], default: 'Active' },
  source: { type: String, default: 'Blog' }
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);