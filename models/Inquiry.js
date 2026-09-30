// models/Inquiry.js
const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, trim: true, default: 'Delhi (NCT)' },
  serviceType: { type: String, default: 'AC Service & Gas Charging' },
  message: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: '' },
  date: { type: String, default: '' },

  // STATUS ENUM ME YE SAARI VALUES ALLOW HONI CHAHIYE:
  status: {
  type: String,
  enum: ['Pending', 'In Progress', 'Resolved', 'Cancelled', 'New', 'Contacted', 'Completed'],
  default: 'Pending'
},

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inquiry', inquirySchema);