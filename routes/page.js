const express = require('express');
const router = express.Router();
const pageController = require('../controllers/Main/PageController');
const blockController = require('../controllers/Main/BlockController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');

// Page routes
router.get('/pages', pageController.getAllPages);
router.get('/pages/published-navigation', pageController.getPublishedPages);
router.get('/pages/:id', pageController.getPage);
router.get('/pages/by-slug/:slug', pageController.getPage);
router.post('/pages', auth, restrictTo('ADMIN'), pageController.createPage);
router.put('/pages/:id', auth, restrictTo('ADMIN'), pageController.updatePage);
router.delete('/pages/:id', auth, restrictTo('ADMIN'), pageController.deletePage);

// Block routes
router.get('/blocks', auth, restrictTo('ADMIN'), blockController.getAllBlocks);
router.get('/blocks/:id', blockController.getBlock);
router.post('/blocks', auth, restrictTo('ADMIN'), blockController.createBlock);
router.put('/blocks/:id', auth, restrictTo('ADMIN'), blockController.updateBlock);
router.delete('/blocks/:id', auth, restrictTo('ADMIN'), blockController.deleteBlock);

// Block template routes
router.get('/block-templates', blockController.getBlockTemplates);
router.post('/block-templates', auth, restrictTo('ADMIN'), blockController.createBlockTemplate);
router.put('/block-templates/:id', auth, restrictTo('ADMIN'), blockController.updateBlockTemplate);
router.delete('/block-templates/:id', auth, restrictTo('ADMIN'), blockController.deleteBlockTemplate);

module.exports = router; 