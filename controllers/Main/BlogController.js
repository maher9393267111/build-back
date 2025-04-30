const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const slugify = require('slugify');

// List blogs with pagination, search, and category filtering (Public)
exports.list = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = '', 
      sort = 'newest' 
    } = req.query;
    
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({ message: 'Invalid pagination parameters' });
    }
    
    // Build the where clause
    const where = { status: 'published' };
    
    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add category filter
    if (category) {
      // First check if the category exists by slug
      const categoryEntity = await prisma.blogCategory.findFirst({
        where: { slug: category, status: 'active' }
      });
      
      if (categoryEntity) {
        where.categoryId = categoryEntity.id;
      }
    }
    
    // Determine sorting
    let orderBy = {};
    switch (sort) {
      case 'newest':
        orderBy = { publishedAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { publishedAt: 'asc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'title':
        orderBy = { title: 'asc' };
        break;
      default:
        orderBy = { publishedAt: 'desc' };
    }
    
    // Execute query with pagination
    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        orderBy,
        skip,
        take: limitNumber,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }),
      prisma.blog.count({ where })
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;
    
    return res.status(200).json({
      blogs,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return res.status(500).json({ message: 'Error fetching blogs' });
  }
};

// Get a single blog by slug (Public)
exports.getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const blog = await prisma.blog.findFirst({
      where: { 
        slug,
        status: 'published'
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Increment view count
    await prisma.blog.update({
      where: { id: blog.id },
      data: { viewCount: { increment: 1 } }
    });
    
    return res.status(200).json({ blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return res.status(500).json({ message: 'Error fetching blog' });
  }
};

// Create a new blog (Admin only)
exports.create = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      excerpt, 
      featuredImage, 
      categoryId, 
      status = 'draft'
    } = req.body;
    
    if (!title || !content || !categoryId) {
      return res.status(400).json({ message: 'Title, content, and category are required' });
    }
    
    // Validate category
    const category = await prisma.blogCategory.findUnique({
      where: { id: parseInt(categoryId, 10) }
    });
    
    if (!category) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Generate slug from title
    let slug = slugify(title, { lower: true, strict: true });
    
    // Check if slug exists and make it unique if needed
    const slugExists = await prisma.blog.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${Date.now()}`;
    }
    
    const blogData = {
      title,
      slug,
      content,
      excerpt: excerpt || title.substring(0, 150),
      categoryId: parseInt(categoryId, 10),
      status,
      featuredImage
    };
    
    // Add publishedAt date if status is published
    if (status === 'published') {
      blogData.publishedAt = new Date();
    }
    
    const blog = await prisma.blog.create({
      data: blogData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    return res.status(201).json({ 
      message: 'Blog created successfully',
      blog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    return res.status(500).json({ message: 'Error creating blog' });
  }
};

// Update a blog (Admin only)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      excerpt, 
      featuredImage, 
      categoryId, 
      status 
    } = req.body;
    
    const blogId = parseInt(id, 10);
    if (isNaN(blogId)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }
    
    // Check if blog exists
    const existingBlog = await prisma.blog.findFirst({
      where: { id: blogId }
    });
    
    if (!existingBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    const updateData = {};
    
    if (title) {
      updateData.title = title;
      
      // Only update slug if title changes
      if (title !== existingBlog.title) {
        let newSlug = slugify(title, { lower: true, strict: true });
        
        // Check if new slug already exists
        const slugExists = await prisma.blog.findFirst({
          where: { 
            slug: newSlug,
            id: { not: blogId }
          }
        });
        
        if (slugExists) {
          newSlug = `${newSlug}-${Date.now()}`;
        }
        
        updateData.slug = newSlug;
      }
    }
    
    if (content) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    
    if (categoryId) {
      // Validate category
      const category = await prisma.blogCategory.findUnique({
        where: { id: parseInt(categoryId, 10) }
      });
      
      if (!category) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      
      updateData.categoryId = parseInt(categoryId, 10);
    }
    
    if (status) {
      updateData.status = status;
      
      // If transitioning to published and doesn't have a publish date yet
      if (status === 'published' && !existingBlog.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    
    const blog = await prisma.blog.update({
      where: { id: blogId },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    return res.status(200).json({ 
      message: 'Blog updated successfully',
      blog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    return res.status(500).json({ message: 'Error updating blog' });
  }
};

// Delete a blog (Admin only)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blogId = parseInt(id, 10);
    if (isNaN(blogId)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }
    
    // Check if blog exists
    const existingBlog = await prisma.blog.findUnique({
      where: { id: blogId }
    });
    
    if (!existingBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    await prisma.blog.delete({
      where: { id: blogId }
    });
    
    return res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return res.status(500).json({ message: 'Error deleting blog' });
  }
};

// Get admin dashboard stats and blog list (Admin only)
exports.getAdminBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = '', 
      status = '' 
    } = req.query;
    
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Build where clause for filtering
    const where = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.categoryId = parseInt(category, 10);
    }
    
    if (status) {
      where.status = status;
    }
    
    // Get blogs with pagination
    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNumber,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }),
      prisma.blog.count({ where })
    ]);
    
    // Get stats for dashboard
    const [published, drafts, totalViews] = await Promise.all([
      prisma.blog.count({ where: { status: 'published' } }),
      prisma.blog.count({ where: { status: 'draft' } }),
      prisma.blog.aggregate({ _sum: { viewCount: true } })
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;
    
    return res.status(200).json({
      blogs,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      stats: {
        published,
        drafts,
        total: published + drafts,
        totalViews: totalViews._sum.viewCount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching admin blogs:', error);
    return res.status(500).json({ message: 'Error fetching admin blogs' });
  }
};

// Get related blogs (Public)
exports.getRelated = async (req, res) => {
  try {
    const { id, categoryId, limit = 3 } = req.query;
    
    if (!id || !categoryId) {
      return res.status(400).json({ message: 'Blog ID and category ID are required' });
    }
    
    const blogId = parseInt(id, 10);
    const catId = parseInt(categoryId, 10);
    const limitNum = parseInt(limit, 10);
    
    if (isNaN(blogId) || isNaN(catId) || isNaN(limitNum)) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }
    
    const relatedBlogs = await prisma.blog.findMany({
      where: {
        categoryId: catId,
        id: { not: blogId },
        status: 'published'
      },
      orderBy: { publishedAt: 'desc' },
      take: limitNum,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    
    return res.status(200).json({ blogs: relatedBlogs });
  } catch (error) {
    console.error('Error fetching related blogs:', error);
    return res.status(500).json({ message: 'Error fetching related blogs' });
  }
};






// Get a blog by ID (Admin only)



exports.getBlogById = async (req, res) => {
    try {
      const { id } = req.params;
      
      const blogId = parseInt(id, 10);
      if (isNaN(blogId)) {
        return res.status(400).json({ message: 'Invalid blog ID' });
      }
      
      const blog = await prisma.blog.findFirst({
        where: { id: blogId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });
      
      if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
      }
      
      return res.status(200).json({ blog });
    } catch (error) {
      console.error('Error fetching blog by ID:', error);
      return res.status(500).json({ message: 'Error fetching blog' });
    }
  };