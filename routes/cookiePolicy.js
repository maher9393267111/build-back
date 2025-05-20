const express = require('express');
const router = express.Router();
const cookiePolicyController = require('../controllers/CookiePolicyController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');

// Get cookie policy (public)
router.get('/cookie-policy', cookiePolicyController.getCookiePolicy);

// Update cookie policy (admin only)
router.put('/cookie-policy', auth, restrictTo('ADMIN'), cookiePolicyController.updateCookiePolicy);

module.exports = router; 