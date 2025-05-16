const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/AnalyticsController');
const { auth, restrictTo } = require('../utils/AuthMiddleware'); // Assuming you might want to protect stats endpoint
const rateLimit = require('express-rate-limit');

// Add rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests from this IP, please try again after a minute'
});

// Apply rate limiter to analytics endpoints
router.use(analyticsLimiter);

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


router.post('/reset-form-submissions', analyticsController.resetFormSubmissions);
router.post('/reset-form-submissions/:formId', analyticsController.resetFormSubmissionsByFormId);
router.post('/reset-page-activities', analyticsController.resetPageActivities);

module.exports = router;