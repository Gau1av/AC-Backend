const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const inquiryController = require('../controllers/inquiryController');
const Business = require('../models/Business'); // Business Model import karein
const Inquiry = require('../models/Inquiry');   // Inquiry Model import karein

// Debugging checks
console.log('adminLogin exists?', typeof adminController?.adminLogin === 'function');
console.log('getInquiries exists?', typeof inquiryController?.getInquiries === 'function');
console.log('getAnalytics exists?', typeof inquiryController?.getAnalytics === 'function');

// ==============================
// 1. AUTH ROUTES
// ==============================
router.post('/login', adminController.adminLogin || ((req, res) => {
  res.status(500).json({ success: false, message: 'adminLogin function missing in adminController.js' });
}));

// ==============================
// 2. DYNAMIC TOP STATS ROUTE (Live Database Count)
// ==============================
router.get('/stats', async (req, res) => {
  try {
    const totalBusiness = await Business.countDocuments();
    const totalPaid = await Business.countDocuments({ isPaid: true });
    const totalLead = await Inquiry.countDocuments();
    const totalContact = await Inquiry.countDocuments({ status: 'Contacted' });

    res.json({
      success: true,
      stats: {
        totalBusiness,
        totalPaid,
        totalLead,
        totalContact
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch dynamic stats', error: err.message });
  }
});

// ==============================
// 3. INQUIRIES & LEADS ROUTES
// ==============================
router.get('/inquiries', inquiryController.getInquiries || ((req, res) => {
  res.status(500).json({ success: false, message: 'getInquiries function missing in inquiryController.js' });
}));
router.post('/inquiries', inquiryController.createInquiry);
router.delete('/inquiries/:id', inquiryController.deleteInquiry);
router.put('/inquiries/:id', inquiryController.updateInquiryStatus);
router.get('/analytics', inquiryController.getAnalytics || ((req, res) => {
  res.status(500).json({ success: false, message: 'getAnalytics function missing in inquiryController.js' });
}));

// ==============================
// 4. BUSINESS DIRECTORY & FILTERS (Category, State, City, Search)
// ==============================

// Fetch businesses with multi-filters
router.get('/businesses', async (req, res) => {
  try {
    const { category, state, city, search } = req.query;
    let filter = {};

    if (category && category !== 'All') {
      filter.serviceCategory = category;
    }
    if (state && state !== 'All') {
      filter.state = { $regex: new RegExp(`^${state}$`, 'i') };
    }
    if (city && city !== 'All') {
      filter.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }
    if (search) {
      filter.$or = [
        { businessName: { $regex: search,$options: 'i' } },
        { ownerName: { $regex: search,$options: 'i' } },
        { phone: { $regex: search,$options: 'i' } }
      ];
    }

    const list = await Business.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register new business
router.post('/businesses/register', async (req, res) => {
  try {
    const { businessName, ownerName, phone, state, city, serviceCategory, isPaid, status } = req.body;
    
    if (!businessName || !ownerName || !phone || !city) {
      return res.status(400).json({ success: false, message: 'Sabhi required fields bharna zaroori hai' });
    }

    const newBiz = new Business({
      businessName,
      ownerName,
      phone,
      state: state || 'Delhi',
      city,
      serviceCategory: serviceCategory || 'AC Service & Repair',
      isPaid: Boolean(isPaid),
      status: status || 'Active'
    });

    await newBiz.save();
    res.status(201).json({ success: true, message: 'Business registered successfully!', data: newBiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT: Update business status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      { $set: { status: status } },
      { new: true, runValidators: false }
    );

    if (!updatedBusiness) {
      return res.status(404).json({ success: false, message: 'Business nahi mila' });
    }

    res.json({ success: true, data: updatedBusiness });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Dono routes mapped taaki route prefix ka issue na aaye
router.put('/businesses/:id', updateStatus);
router.put('/admin/businesses/:id', updateStatus);

// Delete business
router.delete('/businesses/:id', async (req, res) => {
  try {
    await Business.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Business successfully deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;