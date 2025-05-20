const express = require('express');
const router = express.Router();
const termsAndConditionsController = require('../controllers/TermsAndConditionsController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');

// Get terms and conditions (public)
router.get('/terms-conditions', termsAndConditionsController.getTermsAndConditions);

// Update terms and conditions (admin only)
router.put('/terms-conditions', auth, restrictTo('ADMIN'), termsAndConditionsController.updateTermsAndConditions);

module.exports = router; 