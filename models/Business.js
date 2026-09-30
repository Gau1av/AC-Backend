// models/Business.js
const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  serviceCategory: { 
    type: String, 
    enum: [
      'AC Service & Gas Charging',    // <-- Yeh add kar diya
      'AC Service & Repair', 
      'Refrigerator Repair', 
      'Washing Machine Service',
      'Preventive Maintenance',
      'Other'
    ], 
    required: true 
  },
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Business', BusinessSchema);