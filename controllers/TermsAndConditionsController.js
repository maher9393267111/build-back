const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Terms and Conditions
exports.getTermsAndConditions = async (req, res) => {
  try {
    let terms = await prisma.termsAndConditions.findFirst();
    
    if (!terms) {
      terms = await prisma.termsAndConditions.create({
        data: {
          seoTitle: 'Terms and Conditions',
          description: '# Terms and Conditions\n\nPlease read these terms and conditions carefully.',
          heroSubTitle: 'Guidelines for using our services',
          heroImage: null
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      terms
    });
  } catch (error) {
    console.error('Error getting terms and conditions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving terms and conditions',
      error: error.message
    });
  }
};

// Update Terms and Conditions
exports.updateTermsAndConditions = async (req, res) => {
  try {
    const data = req.body;
    let terms = await prisma.termsAndConditions.findFirst();
    
    if (terms) {
      terms = await prisma.termsAndConditions.update({
        where: { id: terms.id },
        data
      });
    } else {
      terms = await prisma.termsAndConditions.create({
        data
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Terms and conditions updated successfully',
      terms
    });
  } catch (error) {
    console.error('Error updating terms and conditions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating terms and conditions',
      error: error.message
    });
  }
}; 