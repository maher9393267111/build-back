const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/AnalyticsController');
const { auth, restrictTo } = require('../utils/AuthMiddleware'); // Assuming you might want to protect stats endpoint

// Endpoint to track a page view (public)
router.post('/track-view', analyticsController.trackView);

// Endpoint to get dashboard statistics (admin only)
router.get('/dashboard-stats', analyticsController.getDashboardStats);

// Endpoint to track page activity (admin only)
router.post('/track-page-activity', analyticsController.trackPageActivity);

// Endpoint to get page activity stats (admin only)
router.get('/page-activity-stats', analyticsController.getPageActivityStats);

// Add this new route
router.get('/form-submission-stats', analyticsController.getFormSubmissionStats);

// Add the new global stats endpoint
router.get('/global-stats', analyticsController.getGlobalStats);

module.exports = router;