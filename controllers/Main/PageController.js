const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all pages with pagination
exports.getAllPages = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * parseInt(limit);
        
        const where = {};
        if (status) {
            where.status = status;
        }
        
        const [pages, total] = await Promise.all([
            prisma.page.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }),
            prisma.page.count({ where })
        ]);
        
        return res.status(200).json({
            pages,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching pages:', error);
        return res.status(500).json({ error: 'Failed to fetch pages' });
    }
};

// Get published pages for navigation
exports.getPublishedPages = async (req, res) => {
    try {
        const pages = await prisma.page.findMany({
            where: {
                status: 'published'
            },
            select: {
                id: true,
                title: true,
                slug: true,
                isMainPage: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        
        return res.status(200).json(pages);
    } catch (error) {
        console.error('Error fetching published pages:', error);
        return res.status(500).json({ error: 'Failed to fetch published pages' });
    }
};

// Get a single page by slug or id
exports.getPage = async (req, res) => {
    try {
        const { id, slug } = req.params;
        
        let where = {};
        if (id && !isNaN(parseInt(id))) {
            where.id = parseInt(id);
        } else if (slug) {
            where.slug = slug;
        } else {
            return res.status(400).json({ error: 'Page ID or slug is required' });
        }
        
        const page = await prisma.page.findUnique({
            where,
            include: {
                blocks: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                author: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }
        
        return res.status(200).json(page);
    } catch (error) {
        console.error('Error fetching page:', error);
        return res.status(500).json({ error: 'Failed to fetch page' });
    }
};

// Create a new page
exports.createPage = async (req, res) => {
    try {
        const { title, slug, description, metaTitle, metaKeywords, ogImage, featuredImage, blocks, isMainPage, canonicalUrl, structuredData, robots } = req.body;
        
        // Check if slug is unique
        const existingPage = await prisma.page.findUnique({
            where: { slug }
        });
        
        if (existingPage) {
            return res.status(400).json({ error: 'A page with this slug already exists' });
        }
        

        // If isMainPage is true, reset any existing main page
        if (isMainPage) {
            await prisma.page.updateMany({
                where: { isMainPage: true },
                data: { isMainPage: false }
            });
        }
        
        // Create the page
        const page = await prisma.page.create({
            data: {
                title,
                slug,
                description,
                metaTitle,
                metaKeywords,
                ogImage,
                featuredImage,
                authorId: req.user.id,
                status: req.body.status || 'draft',
                isMainPage: isMainPage || false,
                canonicalUrl,
                structuredData,
                robots
            }
        });
        
        // Create blocks if provided
        if (blocks && Array.isArray(blocks) && blocks.length > 0) {
            const blockPromises = blocks.map((block, index) => {
                return prisma.block.create({
                    data: {
                        type: block.type,
                        title: block.title,
                        content: block.content,
                        orderIndex: block.orderIndex || index,
                        status: block.status || 'active',
                        pageId: page.id
                    }
                });
            });
            
            await Promise.all(blockPromises);
        }
        
        // Return the created page with blocks
        const createdPage = await prisma.page.findUnique({
            where: { id: page.id },
            include: {
                blocks: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                author: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        return res.status(201).json(createdPage);
    } catch (error) {
        console.error('Error creating page:', error);
        return res.status(500).json({ error: 'Failed to create page' });
    }
};

// Update a page
exports.updatePage = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug, description, metaTitle, metaKeywords, ogImage, featuredImage, status, blocks, isMainPage, canonicalUrl, structuredData, robots } = req.body;
        
        // Check if page exists
        const existingPage = await prisma.page.findUnique({
            where: { id: parseInt(id) },
            include: { blocks: true }
        });
        
        if (!existingPage) {
            return res.status(404).json({ error: 'Page not found' });
        }
        
        // If slug is being changed, check if it's unique
        if (slug && slug !== existingPage.slug) {
            const slugExists = await prisma.page.findUnique({
                where: { slug }
            });
            
            if (slugExists) {
                return res.status(400).json({ error: 'A page with this slug already exists' });
            }
        }
        
        // If isMainPage is being set to true, reset any existing main page
        if (isMainPage && !existingPage.isMainPage) {
            await prisma.page.updateMany({
                where: { 
                    isMainPage: true,
                    id: { not: parseInt(id) }
                },
                data: { isMainPage: false }
            });
        }
        
        // Update the page
        const updatedPage = await prisma.page.update({
            where: { id: parseInt(id) },
            data: {
                title,
                slug,
                description,
                metaTitle,
                metaKeywords,
                ogImage,
                featuredImage,
                status,
                isMainPage: isMainPage !== undefined ? isMainPage : existingPage.isMainPage,
                canonicalUrl,
                structuredData,
                robots,
                updatedAt: new Date()
            }
        });
        
        // Handle blocks update if provided
        if (blocks && Array.isArray(blocks)) {
            // Get existing block IDs
            const existingBlockIds = existingPage.blocks.map(block => block.id);
            
            // Determine which blocks to create, update, or delete
            const blockIdsToKeep = blocks
                .filter(block => block.id)
                .map(block => block.id);
            
            const blockIdsToDelete = existingBlockIds.filter(id => !blockIdsToKeep.includes(id));
            
            // Delete blocks that are not in the updated list
            if (blockIdsToDelete.length > 0) {
                await prisma.block.deleteMany({
                    where: {
                        id: { in: blockIdsToDelete }
                    }
                });
            }
            
            // Update or create blocks
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                
                if (block.id) {
                    // Update existing block
                    await prisma.block.update({
                        where: { id: block.id },
                        data: {
                            type: block.type,
                            title: block.title,
                            content: block.content,
                            orderIndex: block.orderIndex || i,
                            status: block.status || 'active',
                            updatedAt: new Date()
                        }
                    });
                } else {
                    // Create new block
                    const { id: blockId, ...blockDataWithoutId } = block; // Remove the id field from the data
                    await prisma.block.create({
                        data: {
                            type: blockDataWithoutId.type,
                            title: blockDataWithoutId.title,
                            content: blockDataWithoutId.content,
                            orderIndex: blockDataWithoutId.orderIndex || i,
                            status: blockDataWithoutId.status || 'active',
                            pageId: parseInt(id)
                        }
                    });
                }
            }
        }
        
        // Return the updated page with blocks
        const result = await prisma.page.findUnique({
            where: { id: parseInt(id) },
            include: {
                blocks: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                author: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error updating page:', error);
        return res.status(500).json({ error: 'Failed to update page' });
    }
};

// Delete a page
exports.deletePage = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if page exists
        const existingPage = await prisma.page.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingPage) {
            return res.status(404).json({ error: 'Page not found' });
        }
        
        // Delete the page (blocks will cascade delete due to onDelete: Cascade)
        await prisma.page.delete({
            where: { id: parseInt(id) }
        });
        
        return res.status(200).json({ message: 'Page deleted successfully' });
    } catch (error) {
        console.error('Error deleting page:', error);
        return res.status(500).json({ error: 'Failed to delete page' });
    }
};

// Add new endpoint to get the main page
exports.getMainPage = async (req, res) => {
    try {
        const mainPage = await prisma.page.findFirst({
            where: {
                isMainPage: true,
                status: 'published'
            },
            include: {
                blocks: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                author: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        if (!mainPage) {
            return res.status(404).json({ error: 'Main page not found' });
        }
        
        return res.status(200).json(mainPage);
    } catch (error) {
        console.error('Error fetching main page:', error);
        return res.status(500).json({ error: 'Failed to fetch main page' });
    }
}; 