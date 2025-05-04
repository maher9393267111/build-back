const express = require('express');
const router = express.Router();
const siteSettingsController = require('../controllers/SiteSettingsController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');

// Get site settings (public)
router.get('/site-settings', siteSettingsController.getSiteSettings);

// Update site settings (admin only)
router.put('/site-settings', auth, restrictTo('ADMIN'), siteSettingsController.updateSiteSettings);

module.exports = router; 