// models/Business.js
const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true },
  state: { type: String, default: 'Delhi (NCT)' },
  city: { type: String, required: true },
  serviceCategory: { 
    type: String, 
    required: true // <-- enum validation is not applied here, but you can add it if needed
  },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive', 'Suspended'], 
    default: 'Active' 
  },
  isPaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Business', BusinessSchema);