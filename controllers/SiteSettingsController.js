const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get site settings
exports.getSiteSettings = async (req, res) => {
  try {
    // Get the first (and only) site settings entry or create default one if it doesn't exist
    let settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          title: 'My Website',
          description: 'Website description',
          primaryColor: '#2563eb',
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error getting site settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving site settings',
      error: error.message
    });
  }
};

// Update site settings
exports.updateSiteSettings = async (req, res) => {
  try {
    const data = req.body;
    let settings = await prisma.siteSettings.findFirst();
    console.log(data ,' data')
    if (settings) {
      // Update existing settings
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data
      });
    } else {
      // Create new settings if none exist
      settings = await prisma.siteSettings.create({
        data
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Site settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating site settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating site settings',
      error: error.message
    });
  }
}; 