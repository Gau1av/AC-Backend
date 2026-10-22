const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');

const adminController = require('../controllers/adminController');
const inquiryController = require('../controllers/inquiryController');
const Business = require('../models/Business');
const Inquiry = require('../models/Inquiry');
const {
  authorizeAdminRoute,
  getRolePermissions
} = require('../middleware/adminAuth');

// In-memory upload for Excel importing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================================================
// 1. PUBLIC AUTH ROUTE
// ============================================================================
router.post('/login', adminController?.adminLogin || ((req, res) => {
  res.status(500).json({ success: false, message: 'adminLogin function missing in adminController.js' });
}));

// ============================================================================
// 2. GLOBAL ROLE & PERMISSION GUARD (Protects all routes below)
// ============================================================================
router.use(authorizeAdminRoute);

// ============================================================================
// 3. SESSION VERIFICATION (/api/admin/me)
// ============================================================================
router.get('/me', (req, res) => {
  try {
    const role = (req.admin?.role || 'manager').toLowerCase();
    const permissions = req.admin?.permissions || getRolePermissions(role) || [];

    return res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        role,
        permissions
      }
    });
  } catch (err) {
    console.error('❌ /api/admin/me error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify session profile' });
  }
});

// ============================================================================
// 4. DYNAMIC TOP STATS
// ============================================================================
router.get('/stats', async (req, res) => {
  try {
    const [totalBusiness, totalPaid, totalLead, totalContact] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ isPaid: true }),
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: { $in: ['Resolved', 'In Progress'] } })
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalBusiness,
        totalPaid,
        totalLead,
        totalContact
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dynamic stats', error: err.message });
  }
});

// ============================================================================
// 5. INQUIRIES & LEADS MANAGEMENT
// ============================================================================
router.get('/inquiries', inquiryController?.getInquiries || ((req, res) => {
  res.status(500).json({ success: false, message: 'getInquiries function missing in inquiryController.js' });
}));
router.post('/inquiries', inquiryController?.createInquiry);
router.delete('/inquiries/:id', inquiryController?.deleteInquiry);
router.put('/inquiries/:id', inquiryController?.updateInquiryStatus);

router.get('/analytics', inquiryController?.getAnalytics || ((req, res) => {
  res.status(500).json({ success: false, message: 'getAnalytics function missing in inquiryController.js' });
}));

// ============================================================================
// 6. BUSINESS DIRECTORY & EXCEL IMPORT
// ============================================================================

// Fetch businesses with filters
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
        { businessName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const list = await Business.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Register single business
router.post('/businesses/register', async (req, res) => {
  try {
    const { businessName, ownerName, phone, state, city, serviceCategory, isPaid, status } = req.body;

    if (!businessName || !ownerName || !phone || !city) {
      return res.status(400).json({ success: false, message: 'Sabhi required fields bharna zaroori hai' });
    }

    const newBiz = new Business({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      state: state || 'Delhi (NCT)',
      city: city.trim(),
      serviceCategory: serviceCategory || 'AC Service & Gas Charging',
      isPaid: Boolean(isPaid),
      status: status || 'Active'
    });

    await newBiz.save();
    return res.status(201).json({ success: true, message: 'Business registered successfully!', data: newBiz });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Excel bulk upload
router.post('/businesses/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach an Excel or CSV file' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rawRows.length) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    const validBusinesses = rawRows
      .filter((r) => r.businessName && r.phone)
      .map((r) => ({
        businessName: String(r.businessName).trim(),
        ownerName: String(r.ownerName || 'Verified Technician').trim(),
        phone: String(r.phone).trim(),
        state: String(r.state || 'Delhi (NCT)').trim(),
        city: String(r.city || 'New Delhi').trim(),
        serviceCategory: String(r.serviceCategory || 'AC Service & Gas Charging').trim(),
        status: r.status || 'Active',
        isPaid: Boolean(r.isPaid === true || r.isPaid === 'true')
      }));

    if (!validBusinesses.length) {
      return res.status(400).json({ success: false, message: 'No valid business rows found (businessName and phone are required)' });
    }

    await Business.insertMany(validBusinesses, { ordered: false });
    return res.status(200).json({
      success: true,
      message: `${validBusinesses.length} businesses imported successfully!`,
      count: validBusinesses.length
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error processing Excel file' });
  }
});

// Update business status
router.put('/businesses/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: false }
    );

    if (!updatedBusiness) {
      return res.status(404).json({ success: false, message: 'Business nahi mila' });
    }

    return res.status(200).json({ success: true, data: updatedBusiness });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete business
router.delete('/businesses/:id', async (req, res) => {
  try {
    await Business.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Business successfully deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;