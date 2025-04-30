const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const slugify = require('slugify');

// Get all blog categories (Public)
exports.list = async (req, res) => {
  try {
    const categories = await prisma.blogCategory.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { blogs: { where: { status: 'published' } } }
        }
      }
    });
    
    return res.status(200).json({
      categories: categories.map(category => ({
        ...category,
        blogCount: category._count.blogs
      }))
    });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return res.status(500).json({ message: 'Error fetching blog categories' });
  }
};

// Create a new blog category (Admin only)
exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    const slug = slugify(name, { lower: true, strict: true });
    
    // Check if slug already exists
    const existingCategory = await prisma.blogCategory.findUnique({
      where: { slug }
    });
    
    if (existingCategory) {
      return res.status(409).json({ message: 'A category with this name already exists' });
    }
    
    const category = await prisma.blogCategory.create({
      data: {
        name,
        slug,
        description,
        status: 'active'
      }
    });
    
    return res.status(201).json({ 
      message: 'Blog category created successfully',
      category
    });
  } catch (error) {
    console.error('Error creating blog category:', error);
    return res.status(500).json({ message: 'Error creating blog category' });
  }
};

// Update a blog category (Admin only)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    // Check if category exists
    const existingCategory = await prisma.blogCategory.findUnique({
      where: { id: categoryId }
    });
    
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const updateData = {};
    
    if (name) {
      updateData.name = name;
      // Only update slug if name changes
      if (name !== existingCategory.name) {
        updateData.slug = slugify(name, { lower: true, strict: true });
        
        // Check if new slug already exists
        const slugExists = await prisma.blogCategory.findFirst({
          where: { 
            slug: updateData.slug,
            id: { not: categoryId }
          }
        });
        
        if (slugExists) {
          return res.status(409).json({ message: 'A category with this name already exists' });
        }
      }
    }
    
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    
    const category = await prisma.blogCategory.update({
      where: { id: categoryId },
      data: updateData
    });
    
    return res.status(200).json({ 
      message: 'Blog category updated successfully',
      category
    });
  } catch (error) {
    console.error('Error updating blog category:', error);
    return res.status(500).json({ message: 'Error updating blog category' });
  }
};

// Delete a blog category (Admin only)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    
    // Check if category has blogs
    const blogs = await prisma.blog.findMany({
      where: { categoryId }
    });
    
    if (blogs.length > 0) {
      return res.status(409).json({ 
        message: 'This category has blogs associated with it. Please reassign or delete those blogs first.' 
      });
    }
    
    await prisma.blogCategory.delete({
      where: { id: categoryId }
    });
    
    return res.status(200).json({ message: 'Blog category deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog category:', error);
    return res.status(500).json({ message: 'Error deleting blog category' });
  }
};