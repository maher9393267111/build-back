const express = require('express');
const router = express.Router();
const formController = require('../controllers/Main/FormController');
const { auth } = require('../utils/AuthMiddleware');

// Forms CRUD routes
router.get('/forms', formController.getAllForms);
router.get('/forms/published', formController.getPublishedForms);
router.get('/forms/:id', formController.getForm);
router.get('/forms/by-slug/:slug', formController.getForm);
router.post('/forms', auth, formController.createForm);
router.put('/forms/:id', auth, formController.updateForm);
router.delete('/forms/:id', auth, formController.deleteForm);

// Form submissions routes
router.post('/forms/:id/submit', formController.submitForm);
router.get('/forms/:id/submissions', auth, formController.getFormSubmissions);
router.get('/forms/:id/submissions/:submissionId', auth, formController.getFormSubmission);
router.put('/forms/:id/submissions/:submissionId/status', auth, formController.updateFormSubmissionStatus);
router.delete('/forms/:id/submissions/:submissionId', auth, formController.deleteFormSubmission);

module.exports = router; 