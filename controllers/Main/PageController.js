const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const googleIndexingService = require('../../services/googleIndexingService');


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
        const {isIndexing, title, slug, description, metaTitle, metaKeywords, ogImage, featuredImage, blocks, isMainPage, canonicalUrl, structuredData, robots, id, ...restData  } = req.body;
        
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
        
        // Notify Google about the new page
        if (req.body.status === 'published' && isIndexing) {
            await googleIndexingService.notifyGoogleAboutPage(createdPage, 'create');
        }
        
        return res.status(201).json(createdPage);
    } catch (error) {
        console.error('Error creating page:', error);
        return res.status(500).json({ error: 'Failed to create page' });
    }
};

// Update a page
// exports.updatePage = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { title, slug, description, metaTitle, metaKeywords, ogImage, featuredImage, status, blocks, isMainPage, canonicalUrl, structuredData, robots } = req.body;
        
//         // Check if page exists
//         const existingPage = await prisma.page.findUnique({
//             where: { id: parseInt(id) },
//             include: { blocks: true }
//         });
        
//         if (!existingPage) {
//             return res.status(404).json({ error: 'Page not found' });
//         }
        
//         // If slug is being changed, check if it's unique
//         if (slug && slug !== existingPage.slug) {
//             const slugExists = await prisma.page.findUnique({
//                 where: { slug }
//             });
            
//             if (slugExists) {
//                 return res.status(400).json({ error: 'A page with this slug already exists' });
//             }
//         }
        
//         // If isMainPage is being set to true, reset any existing main page
//         if (isMainPage && !existingPage.isMainPage) {
//             await prisma.page.updateMany({
//                 where: { 
//                     isMainPage: true,
//                     id: { not: parseInt(id) }
//                 },
//                 data: { isMainPage: false }
//             });
//         }
        
//         // Update the page
//         const updatedPage = await prisma.page.update({
//             where: { id: parseInt(id) },
//             data: {
//                 title,
//                 slug,
//                 description,
//                 metaTitle,
//                 metaKeywords,
//                 ogImage,
//                 featuredImage,
//                 status,
//                 isMainPage: isMainPage !== undefined ? isMainPage : existingPage.isMainPage,
//                 canonicalUrl,
//                 structuredData,
//                 robots,
//                 updatedAt: new Date()
//             }
//         });
        
//         // Handle blocks update if provided
//         if (blocks && Array.isArray(blocks)) {
//             // Get existing block IDs
//             const existingBlockIds = existingPage.blocks.map(block => block.id);
            
//             // Determine which blocks to create, update, or delete
//             const blockIdsToKeep = blocks
//                 .filter(block => block.id)
//                 .map(block => block.id);
            
//             const blockIdsToDelete = existingBlockIds.filter(id => !blockIdsToKeep.includes(id));
            
//             // Delete blocks that are not in the updated list
//             if (blockIdsToDelete.length > 0) {
//                 await prisma.block.deleteMany({
//                     where: {
//                         id: { in: blockIdsToDelete }
//                     }
//                 });
//             }
            
//             // Update or create blocks
//             for (let i = 0; i < blocks.length; i++) {
//                 const block = blocks[i];
                
//                 if (block.id) {
//                     // Update existing block
//                     await prisma.block.update({
//                         where: { id: block.id },
//                         data: {
//                             type: block.type,
//                             title: block.title,
//                             content: block.content,
//                             orderIndex: block.orderIndex || i,
//                             status: block.status || 'active',
//                             updatedAt: new Date()
//                         }
//                     });
//                 } else {
//                     // Create new block
//                     const { id: blockId, ...blockDataWithoutId } = block; // Remove the id field from the data
//                     await prisma.block.create({
//                         data: {
//                             type: blockDataWithoutId.type,
//                             title: blockDataWithoutId.title,
//                             content: blockDataWithoutId.content,
//                             orderIndex: blockDataWithoutId.orderIndex || i,
//                             status: blockDataWithoutId.status || 'active',
//                             pageId: parseInt(id)
//                         }
//                     });
//                 }
//             }
//         }
        
//         // Return the updated page with blocks
//         const result = await prisma.page.findUnique({
//             where: { id: parseInt(id) },
//             include: {
//                 blocks: {
//                     orderBy: {
//                         orderIndex: 'asc'
//                     }
//                 },
//                 author: {
//                     select: {
//                         id: true,
//                         name: true
//                     }
//                 }
//             }
//         });
        
//         // Notify Google about the updated page
//         if (result.status === 'published') {
//             await googleIndexingService.notifyGoogleAboutPage(result, 'update');
//         }
        
//         return res.status(200).json(result);
//     } catch (error) {
//         console.error('Error updating page:', error);
//         return res.status(500).json({ error: 'Failed to update page' });
//     }
// };


// Update a page


// Update a page
exports.updatePage = async (req, res) => {
    try {
        const { id: pageId } = req.params;
        const { 
            isIndexing,
            title, 
            slug, 
            description, 
            metaTitle, 
            metaKeywords, 
            ogImage, 
            featuredImage, 
            status, 
            blocks, 
            isMainPage, 
            canonicalUrl, 
            structuredData, 
            robots 
        } = req.body;
        
        // Check if page exists
        const existingPage = await prisma.page.findUnique({
            where: { id: parseInt(pageId) },
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
                    id: { not: parseInt(pageId) }
                },
                data: { isMainPage: false }
            });
        }
        
        // Update the page
        const updatedPage = await prisma.page.update({
            where: { id: parseInt(pageId) },
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
            // Get existing block IDs from database
            const existingBlockIds = existingPage.blocks.map(block => block.id);
            
            // Debug: Check the current max block ID
            const maxBlock = await prisma.block.findFirst({
                orderBy: { id: 'desc' },
                select: { id: true }
            });
            console.log('Current max block ID:', maxBlock?.id || 'No blocks exist');
            
            // Helper function to check if a block ID is valid and exists in database
            const isValidExistingBlock = (blockId) => {
                // Convert to number and check if it's a valid integer
                const numId = parseInt(blockId);
                if (isNaN(numId) || numId <= 0) return false;
                
                // Check if it exists in the database
                return existingBlockIds.includes(numId);
            };
            
            // Collect valid existing block IDs that should be kept
            const blockIdsToKeep = [];
            
            // Process blocks to determine which are existing vs new
            const processedBlocks = blocks.map((block, index) => {
                // Always create a clean object with only the fields we want
                const cleanBlock = {
                    type: block.type || '',
                    title: block.title || '',
                    content: block.content || {},
                    orderIndex: block.orderIndex !== undefined ? block.orderIndex : index,
                    status: block.status || 'active'
                };
                
                // Check if this is an existing block
                if (block.id && isValidExistingBlock(block.id)) {
                    cleanBlock.id = parseInt(block.id);
                    blockIdsToKeep.push(cleanBlock.id);
                    cleanBlock.isExisting = true;
                } else {
                    // This is a new block - mark as such
                    cleanBlock.isExisting = false;
                }
                
                return cleanBlock;
            });
            
            // Delete blocks that are not in the updated list
            const blockIdsToDelete = existingBlockIds.filter(existingId => !blockIdsToKeep.includes(existingId));
            
            if (blockIdsToDelete.length > 0) {
                console.log('Deleting blocks with IDs:', blockIdsToDelete);
                await prisma.block.deleteMany({
                    where: {
                        id: { in: blockIdsToDelete }
                    }
                });
            }
            
            // Process each block - update existing or create new
            for (const block of processedBlocks) {
                if (block.isExisting) {
                    // Update existing block - explicitly define what fields to update
                    console.log(`Updating existing block with ID: ${block.id}`);
                    
                    await prisma.block.update({
                        where: { id: block.id },
                        data: {
                            type: block.type,
                            title: block.title,
                            content: block.content,
                            orderIndex: block.orderIndex,
                            status: block.status,
                            updatedAt: new Date()
                        }
                    });
                } else {
                    // Create new block - with database-specific approach
                    console.log(`Creating new block of type: ${block.type}`);
                    
                    // Create the data object explicitly - NO ID FIELD AT ALL
                    const createData = {
                        type: block.type,
                        title: block.title,
                        content: block.content,
                        orderIndex: block.orderIndex,
                        status: block.status,
                        pageId: parseInt(pageId)
                    };
                    
                    console.log('Creating block with data:', createData);
                    
                    try {
                        // Try creating the block
                        await prisma.block.create({
                            data: createData
                        });
                    } catch (createError) {
                        console.error('Block creation failed:', createError);
                        
                        // If it's a unique constraint error on ID, try to fix the sequence
                        if (createError.code === 'P2002' && createError.meta?.target?.includes('id')) {
                            console.log('Auto-increment sequence issue detected. Attempting to fix...');
                            
                            // For PostgreSQL, reset the sequence
                            if (process.env.PRODATABASE_URL?.includes('postgres')) {
                                try {
                                    // Get the current max ID
                                    const maxResult = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM "Block"`;
                                    const maxId = maxResult[0]?.max_id || 0;
                                    
                                    // Reset the sequence
                                    await prisma.$executeRaw`ALTER SEQUENCE "Block_id_seq" RESTART WITH ${maxId + 1}`;
                                    console.log(`Reset Block sequence to start at ${maxId + 1}`);
                                    
                                    // Try creating the block again
                                    await prisma.block.create({
                                        data: createData
                                    });
                                    console.log('Block created successfully after sequence reset');
                                } catch (sequenceError) {
                                    console.error('Error resetting sequence:', sequenceError);
                                    throw createError; // Re-throw the original error
                                }
                            } else {
                                // For other databases, just re-throw the error
                                throw createError;
                            }
                        } else {
                            // Re-throw non-ID related errors
                            throw createError;
                        }
                    }
                }
            }
        }
        
        // Return the updated page with blocks
        const result = await prisma.page.findUnique({
            where: { id: parseInt(pageId) },
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
        
        // Notify Google about the updated page
        if (result.status === 'published' && isIndexing) {
            try {
                await googleIndexingService.notifyGoogleAboutPage(result, 'update');
            } catch (indexingError) {
                console.error('Error notifying Google about page update:', indexingError);
                // Don't fail the request if Google indexing fails
            }
        }
        
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error updating page:', error);
        console.error('Error stack:', error.stack);
        
        // More detailed error logging for debugging
        if (error.code === 'P2002') {
            console.error('Unique constraint violation:', error.meta);
        }
        
        return res.status(500).json({ 
            error: 'Failed to update page',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        
        // Notify Google about the deleted page
        await googleIndexingService.notifyGoogleAboutPage(existingPage, 'delete');
        
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