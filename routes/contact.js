const express = require('express');
const router = express.Router();
const contactController = require('../controllers/Main/ContactController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');

// Public route for creating contacts
router.post('/contacts', contactController.createContact);

// Admin-only routes with authentication
router.get('/contacts', auth, restrictTo('ADMIN'), contactController.getAllContacts);
router.get('/contacts/:id', auth, restrictTo('ADMIN'), contactController.getContactById);
router.put('/contacts/:id', auth, restrictTo('ADMIN'), contactController.updateContact);
router.patch('/contacts/:id/status', auth, restrictTo('ADMIN'), contactController.updateContactStatus);
router.delete('/contacts/:id', auth, restrictTo('ADMIN'), contactController.deleteContact);

module.exports = router; 