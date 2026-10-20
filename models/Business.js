// models/Business.js
const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  ownerName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  email: { type: String, trim: true, lowercase: true, default: '', maxlength: 150 },
  state: { type: String, default: 'Delhi (NCT)', trim: true, maxlength: 80 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  address: { type: String, trim: true, default: '', maxlength: 200 },
  serviceCategory: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, default: '', maxlength: 1500 },
  serviceAreas: { type: String, trim: true, default: '', maxlength: 200 },
  experienceYears: { type: Number, min: 0, max: 80, default: 0 },
  serviceHours: { type: String, trim: true, default: '', maxlength: 100 },
  priceRange: { type: String, trim: true, default: '', maxlength: 100 },
  imageUrl: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Inactive', 'Suspended'],
    default: 'Active' 
  },
  isPaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Business', BusinessSchema);