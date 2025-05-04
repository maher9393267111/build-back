const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { singleFileDelete } = require('../utils/S3Utils');

// Get all media with pagination and filtering
exports.getAllMedia = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, search } = req.query;
    const skip = (page - 1) * parseInt(limit);
    
    // Build filter object
    let where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get media items with count
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.media.count({ where })
    ]);
    
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.status(200).json({
      media,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media items' });
  }
};

// Get media by ID
exports.getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const media = await prisma.media.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    res.status(200).json({ media });
  } catch (error) {
    console.error('Error fetching media item:', error);
    res.status(500).json({ error: 'Failed to fetch media item' });
  }
};

// Create new media entry
exports.createMedia = async (req, res) => {
  try {
    const { name, fileId, url, type, mimeType, size, originalName, isDefaultImage = false } = req.body;
    
    if (!fileId || !url || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const media = await prisma.media.create({
      data: {
        name: name || originalName || 'Untitled',
        fileId,
        url,
        type,
        mimeType,
        size: size ? parseInt(size) : null,
        originalName,
        isDefaultImage
      }
    });
    
    res.status(201).json({ media });
  } catch (error) {
    console.error('Error creating media item:', error);
    res.status(500).json({ error: 'Failed to create media item' });
  }
};

// Update media details
exports.updateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isDefaultImage, inUse } = req.body;
    
    // Only allow updating certain fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (isDefaultImage !== undefined) updateData.isDefaultImage = isDefaultImage;
    if (inUse !== undefined) updateData.inUse = inUse;
    
    const media = await prisma.media.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    res.status(200).json({ media });
  } catch (error) {
    console.error('Error updating media item:', error);
    res.status(500).json({ error: 'Failed to update media item' });
  }
};

// Delete media
exports.deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true'; // Add force parameter
    
    // First get the media to check if it's in use
    const media = await prisma.media.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    if (media.inUse && !force) {
      return res.status(400).json({ 
        error: 'Cannot delete media that is in use',
        message: 'This media file is currently being used in pages or blocks. Remove it from those locations first, or use force=true to override.'
      });
    }
    
    // Delete from S3
    try {
      await singleFileDelete(media.fileId);
    } catch (s3Error) {
      console.error('Error deleting file from S3:', s3Error);
      // Continue even if S3 deletion fails
    }
    
    // Delete from database
    await prisma.media.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(200).json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media item:', error);
    res.status(500).json({ error: 'Failed to delete media item' });
  }
};

// Bulk delete media
exports.bulkDeleteMedia = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No media IDs provided' });
    }
    
    // Get all media items that aren't in use
    const mediaItems = await prisma.media.findMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) },
        inUse: false
      }
    });
    
    if (mediaItems.length === 0) {
      return res.status(400).json({ 
        error: 'No eligible media to delete',
        message: 'All selected media items are either in use or not found.'
      });
    }
    
    // Delete from S3
    const s3Deletions = mediaItems.map(media => 
      singleFileDelete(media.fileId).catch(err => {
        console.error(`Error deleting ${media.fileId} from S3:`, err);
        return null; // Continue even if individual deletions fail
      })
    );
    
    await Promise.all(s3Deletions);
    
    // Delete from database
    await prisma.media.deleteMany({
      where: {
        id: { in: mediaItems.map(media => media.id) }
      }
    });
    
    res.status(200).json({ 
      message: `${mediaItems.length} media items deleted successfully`,
      deletedIds: mediaItems.map(media => media.id)
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ error: 'Failed to delete media items' });
  }
};

// Update an uploaded file to mark it as part of the media library
exports.registerUploadedFile = async (req, res) => {
  try {
    const { fileId, url, name, type, mimeType, size, originalName } = req.body;
    
    if (!fileId || !url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if already exists
    const existing = await prisma.media.findUnique({
      where: { fileId }
    });
    
    if (existing) {
      return res.status(200).json({ media: existing, existing: true });
    }
    
    // Create new media entry
    const media = await prisma.media.create({
      data: {
        name: name || originalName || 'Untitled',
        fileId,
        url,
        type: type || 'image',
        mimeType,
        size: size ? parseInt(size) : null,
        originalName,
        isDefaultImage: false,
        inUse: true // Mark as in use immediately
      }
    });
    
    res.status(201).json({ media, existing: false });
  } catch (error) {
    console.error('Error registering uploaded file:', error);
    res.status(500).json({ error: 'Failed to register uploaded file' });
  }
}; 