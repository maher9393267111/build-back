const express = require('express');
const router = express.Router();
const sitemapController = require('../controllers/Main/SitemapController');

// Route to get sitemap data (pages and blogs slugs)
router.get('/sitemap-data', sitemapController.getSitemapData);

module.exports = router; 