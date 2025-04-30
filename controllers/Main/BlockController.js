const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all blocks with pagination (admin use)
exports.getAllBlocks = async (req, res) => {
    try {
        const { page = 1, limit = 10, type, status } = req.query;
        const skip = (page - 1) * parseInt(limit);
        
        const where = {};
        if (type) {
            where.type = type;
        }
        if (status) {
            where.status = status;
        }
        
        const [blocks, total] = await Promise.all([
            prisma.block.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    page: {
                        select: {
                            id: true,
                            title: true,
                            slug: true
                        }
                    }
                }
            }),
            prisma.block.count({ where })
        ]);
        
        return res.status(200).json({
            blocks,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return res.status(500).json({ error: 'Failed to fetch blocks' });
    }
};

// Get a single block
exports.getBlock = async (req, res) => {
    try {
        const { id } = req.params;
        
        const block = await prisma.block.findUnique({
            where: { id: parseInt(id) },
            include: {
                page: {
                    select: {
                        id: true,
                        title: true,
                        slug: true
                    }
                }
            }
        });
        
        if (!block) {
            return res.status(404).json({ error: 'Block not found' });
        }
        
        return res.status(200).json(block);
    } catch (error) {
        console.error('Error fetching block:', error);
        return res.status(500).json({ error: 'Failed to fetch block' });
    }
};

// Create a new block
exports.createBlock = async (req, res) => {
    try {
        const { type, title, content, orderIndex, status, pageId } = req.body;
        
        // Check if page exists
        const pageExists = await prisma.page.findUnique({
            where: { id: parseInt(pageId) }
        });
        
        if (!pageExists) {
            return res.status(404).json({ error: 'Page not found' });
        }
        
        // Create the block
        const block = await prisma.block.create({
            data: {
                type,
                title,
                content,
                orderIndex: orderIndex || 0,
                status: status || 'active',
                pageId: parseInt(pageId)
            }
        });
        
        return res.status(201).json(block);
    } catch (error) {
        console.error('Error creating block:', error);
        return res.status(500).json({ error: 'Failed to create block' });
    }
};

// Update a block
exports.updateBlock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, title, content, orderIndex, status, pageId } = req.body;
        
        // Check if block exists
        const existingBlock = await prisma.block.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingBlock) {
            return res.status(404).json({ error: 'Block not found' });
        }
        
        // If pageId is being changed, check if the new page exists
        if (pageId && pageId !== existingBlock.pageId) {
            const pageExists = await prisma.page.findUnique({
                where: { id: parseInt(pageId) }
            });
            
            if (!pageExists) {
                return res.status(404).json({ error: 'New page not found' });
            }
        }
        
        // Update the block
        const updatedBlock = await prisma.block.update({
            where: { id: parseInt(id) },
            data: {
                type,
                title,
                content,
                orderIndex,
                status,
                pageId: pageId ? parseInt(pageId) : undefined,
                updatedAt: new Date()
            }
        });
        
        return res.status(200).json(updatedBlock);
    } catch (error) {
        console.error('Error updating block:', error);
        return res.status(500).json({ error: 'Failed to update block' });
    }
};

// Delete a block
exports.deleteBlock = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if block exists
        const existingBlock = await prisma.block.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingBlock) {
            return res.status(404).json({ error: 'Block not found' });
        }
        
        // Delete the block
        await prisma.block.delete({
            where: { id: parseInt(id) }
        });
        
        return res.status(200).json({ message: 'Block deleted successfully' });
    } catch (error) {
        console.error('Error deleting block:', error);
        return res.status(500).json({ error: 'Failed to delete block' });
    }
};

// Get block templates
exports.getBlockTemplates = async (req, res) => {
    try {
        const { type, status } = req.query;
        
        const where = {};
        if (type) {
            where.type = type;
        }
        if (status) {
            where.status = status;
        }
        
        const templates = await prisma.blockTemplate.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        
        return res.status(200).json(templates);
    } catch (error) {
        console.error('Error fetching block templates:', error);
        return res.status(500).json({ error: 'Failed to fetch block templates' });
    }
};

// Create a block template
exports.createBlockTemplate = async (req, res) => {
    try {
        const { name, type, content, status } = req.body;
        
        // Check if template with the same name already exists
        const existingTemplate = await prisma.blockTemplate.findUnique({
            where: { name }
        });
        
        if (existingTemplate) {
            return res.status(400).json({ error: 'A template with this name already exists' });
        }
        
        // Create the template
        const template = await prisma.blockTemplate.create({
            data: {
                name,
                type,
                content,
                status: status || 'active'
            }
        });
        
        return res.status(201).json(template);
    } catch (error) {
        console.error('Error creating block template:', error);
        return res.status(500).json({ error: 'Failed to create block template' });
    }
};

// Update a block template
exports.updateBlockTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, content, status } = req.body;
        
        // Check if template exists
        const existingTemplate = await prisma.blockTemplate.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        // If name is being changed, check if it's unique
        if (name && name !== existingTemplate.name) {
            const nameExists = await prisma.blockTemplate.findUnique({
                where: { name }
            });
            
            if (nameExists) {
                return res.status(400).json({ error: 'A template with this name already exists' });
            }
        }
        
        // Update the template
        const updatedTemplate = await prisma.blockTemplate.update({
            where: { id: parseInt(id) },
            data: {
                name,
                type,
                content,
                status,
                updatedAt: new Date()
            }
        });
        
        return res.status(200).json(updatedTemplate);
    } catch (error) {
        console.error('Error updating block template:', error);
        return res.status(500).json({ error: 'Failed to update block template' });
    }
};

// Delete a block template
exports.deleteBlockTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if template exists
        const existingTemplate = await prisma.blockTemplate.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        // Delete the template
        await prisma.blockTemplate.delete({
            where: { id: parseInt(id) }
        });
        
        return res.status(200).json({ message: 'Block template deleted successfully' });
    } catch (error) {
        console.error('Error deleting block template:', error);
        return res.status(500).json({ error: 'Failed to delete block template' });
    }
}; 