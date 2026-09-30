const express = require('express');
const router = express.Router();
const { createInquiry } = require('../controllers/inquiryController');

// Public route inquiry submit karne ke liye
router.post('/', createInquiry);

module.exports = router;