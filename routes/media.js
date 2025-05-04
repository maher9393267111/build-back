const express = require('express');
const mediaController = require('../controllers/MediaController');

const mediaRouter = express.Router();

// Get all media with pagination and filtering
mediaRouter.get('/media', mediaController.getAllMedia);

// Get media by ID
mediaRouter.get('/media/:id', mediaController.getMediaById);

// Create new media entry
mediaRouter.post('/media', mediaController.createMedia);

// Update media details
mediaRouter.put('/media/:id', mediaController.updateMedia);

// Delete media
mediaRouter.delete('/media/:id', mediaController.deleteMedia);

// Bulk delete media
mediaRouter.post('/media/bulk-delete', mediaController.bulkDeleteMedia);

// Register an uploaded file to the media library
mediaRouter.post('/media/register-upload', mediaController.registerUploadedFile);

module.exports = mediaRouter; 