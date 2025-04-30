const faqController = require('../controllers/Main/FaqController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');
const express = require('express');
const router = express.Router();

// Public
router.get('/faqs', faqController.list);

// Admin
router.get('/admin/faqs', auth, restrictTo('ADMIN'), faqController.adminList);
router.post('/faqs', auth, restrictTo('ADMIN'), faqController.create);
router.put('/faqs/:id', auth, restrictTo('ADMIN'), faqController.update);
router.delete('/faqs/:id', auth, restrictTo('ADMIN'), faqController.remove);

module.exports = router;