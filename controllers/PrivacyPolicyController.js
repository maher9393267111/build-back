const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Privacy Policy
exports.getPrivacyPolicy = async (req, res) => {
  try {
    let policy = await prisma.privacyPolicy.findFirst();
    
    if (!policy) {
      policy = await prisma.privacyPolicy.create({
        data: {
          seoTitle: 'Privacy Policy',
          description: '# Privacy Policy\n\nYour privacy is important to us.',
          heroSubTitle: 'Our commitment to your privacy',
          heroImage: null
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('Error getting privacy policy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving privacy policy',
      error: error.message
    });
  }
};

// Update Privacy Policy
exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const data = req.body;
    let policy = await prisma.privacyPolicy.findFirst();
    
    if (policy) {
      policy = await prisma.privacyPolicy.update({
        where: { id: policy.id },
        data
      });
    } else {
      policy = await prisma.privacyPolicy.create({
        data
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Privacy policy updated successfully',
      policy
    });
  } catch (error) {
    console.error('Error updating privacy policy:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating privacy policy',
      error: error.message
    });
  }
}; 