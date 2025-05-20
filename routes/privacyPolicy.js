const express = require('express');
const router = express.Router();
const privacyPolicyController = require('../controllers/PrivacyPolicyController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');

// Get privacy policy (public)
router.get('/privacy-policy', privacyPolicyController.getPrivacyPolicy);

// Update privacy policy (admin only)
router.put('/privacy-policy', auth, restrictTo('ADMIN'), privacyPolicyController.updatePrivacyPolicy);

module.exports = router; 