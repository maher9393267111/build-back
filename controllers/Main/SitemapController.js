const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSitemapData = async (req, res) => {
  try {
    console.log("Fetching sitemap data...");

    const pages = await prisma.page.findMany({
      where: {
        status: 'published', // Only include published pages
      },
      select: {
        slug: true,
        updatedAt: true,
        title: true, // Add title for display,
        isMainPage: true
      },
    });
    console.log(`Fetched ${pages.length} published pages.`);


    const blogs = await prisma.blog.findMany({
        where: {
          status: 'published', // Only include published blogs
        },
        select: {
          slug: true,
          updatedAt: true,
          title: true // Add title for display
        },
      });
      console.log(`Fetched ${blogs.length} published blogs.`);


    res.status(200).json({
      success: true,
      pages,
      blogs,
    });
  } catch (error) {
    console.error('Error fetching sitemap data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sitemap data', error: error.message });
  }
}; 