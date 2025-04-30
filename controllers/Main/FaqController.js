const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List all FAQs (public)
exports.list = async (req, res) => {
  try {
    const faqs = await prisma.faq.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FAQs.' });
  }
};

// Admin: List all FAQs (including inactive)
exports.adminList = async (req, res) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching FAQs.' });
  }
};

// Admin: Create FAQ
exports.create = async (req, res) => {
  try {
    const { question, answer, status } = req.body;
    const faq = await prisma.faq.create({ data: { question, answer, status: status || 'active' } });
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error creating FAQ.' });
  }
};

// Admin: Update FAQ
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, status } = req.body;
    const faq = await prisma.faq.update({
      where: { id: parseInt(id, 10) },
      data: { question, answer, status }
    });
    res.status(200).json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error updating FAQ.' });
  }
};

// Admin: Delete FAQ
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.faq.delete({ where: { id: parseInt(id, 10) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting FAQ.' });
  }
};