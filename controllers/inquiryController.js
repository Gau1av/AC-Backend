const Inquiry = require('../models/Inquiry');
const mongoose = require('mongoose');

// 1. Save Inquiry (Homepage / Admin Manual Booking)
exports.createInquiry = async (req, res) => {
  try {
    const {
      name,
      mobile,
      city,
      state,
      serviceType,
      message,
      email,
      date,
      status
    } = req.body;

    // Required fields check
    if (!name || !mobile || !city || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (Name, Mobile, City, Message).'
      });
    }

    const newInquiry = new Inquiry({
      name: name.trim(),
      mobile: mobile.trim(),
      city: city.trim(),
      state: state ? state.trim() : 'Delhi (NCT)',
      serviceType: serviceType || 'AC Service & Gas Charging',
      message: message.trim(),
      email: email ? email.trim() : '',
      date: date || '',
      status: status ? status.trim() : 'Pending'
    });

    await newInquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully!',
      data: newInquiry
    });

  } catch (error) {
    console.error('❌ Inquiry submission error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 2. Admin Search & Multi-Filter Inquiries (Category, State, City, Search)
exports.getInquiries = async (req, res) => {
  try {
    const { search, category, state, city } = req.query;

    let query = {};

    // Filter by Category / Service Type
    if (category && category !== 'All') {
      query.serviceType = { $regex: category.split(' ')[0],$options: 'i' };
    }

    // Filter by State
    if (state && state !== 'All') {
      query.state = { $regex: new RegExp(`^${state}$`, 'i') };
    }

    // Filter by City
    if (city && city !== 'All') {
      query.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }

    // Keyword Search (Name, Mobile, City)
    if (search && search.trim() !== '') {
      query.$or = [
        { name: { $regex: search.trim(),$options: 'i' } },
        { mobile: { $regex: search.trim(),$options: 'i' } },
        { city: { $regex: search.trim(),$options: 'i' } }
      ];
    }

    const inquiries = await Inquiry
      .find(query)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries
    });

  } catch (error) {
    console.error('❌ Get inquiries error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3. Delete Inquiry by ID
exports.deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Inquiry ID' });
    }

    const deletedInquiry = await Inquiry.findByIdAndDelete(id);

    if (!deletedInquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Inquiry Status (Pending -> In Progress -> Resolved)
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log("➡️ Update Status Request for ID:", id, "| Status:", status);

    // 1. Valid MongoDB ObjectId check
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid MongoDB Inquiry ID zaroori hai.'
      });
    }

    // 2. Status payload check
    if (!status || typeof status !== 'string' || status.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Status provide karna zaroori hai (e.g. Pending, Resolved).'
      });
    }

    const cleanStatus = status.trim();

    // 3. Database Update with safe validation options
    const updated = await Inquiry.findByIdAndUpdate(
      id,
      { status: cleanStatus },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry record database me nahi mila.'
      });
    }

    console.log("✅ Status Updated Successfully:", updated._id, "➔", updated.status);

    return res.status(200).json({
      success: true,
      message: `Status successfully updated to "${updated.status}"`,
      data: updated
    });
  } catch (error) {
    console.error('❌ Status update backend error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Database validation error while updating status.'
    });
  }
};

// 5. Aggregated Chart Data (Day, Month, Year)
exports.getAnalytics = async (req, res) => {
  try {
    const { range } = req.query;

    let format = '%Y-%m-%d';

    if (range === 'month') {
      format = '%Y-%m';
    }

    if (range === 'year') {
      format = '%Y';
    }

    const analytics = await Inquiry.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: format,
              date: '$createdAt'
            }
          },
          count: {
            $sum: 1           }         }       },       {$sort: {
          _id: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};