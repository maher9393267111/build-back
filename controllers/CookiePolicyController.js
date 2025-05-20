const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Cookie Policy
exports.getCookiePolicy = async (req, res) => {
  try {
    let policy = await prisma.cookiePolicy.findFirst();
    
    if (!policy) {
      policy = await prisma.cookiePolicy.create({
        data: {
          seoTitle: 'Cookie Policy',
          description: '# Cookie Policy\n\nWe use cookies to enhance your experience.',
          heroSubTitle: 'Understanding our cookie usage',
          heroImage: null
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('Error getting cookie policy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving cookie policy',
      error: error.message
    });
  }
};

// Update Cookie Policy
exports.updateCookiePolicy = async (req, res) => {
  try {
    const data = req.body;
    let policy = await prisma.cookiePolicy.findFirst();
    
    if (policy) {
      policy = await prisma.cookiePolicy.update({
        where: { id: policy.id },
        data
      });
    } else {
      policy = await prisma.cookiePolicy.create({
        data
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Cookie policy updated successfully',
      policy
    });
  } catch (error) {
    console.error('Error updating cookie policy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating cookie policy',
      error: error.message
    });
  }
}; 