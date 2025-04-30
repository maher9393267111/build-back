// Add after the import statements
const blogCategoryController = require('../controllers/Main/BlogCategoryController');
const blogController = require('../controllers/Main/BlogController');
const { auth, restrictTo } = require('../utils/AuthMiddleware');
const express = require('express');
const router = express.Router();


// Add after the other route blocks
// Blog Category Routes
router.get('/blog-categories', blogCategoryController.list); // Public
router.post('/blog-categories', auth, restrictTo('ADMIN'), blogCategoryController.create);
router.put('/blog-categories/:id', auth, restrictTo('ADMIN'), blogCategoryController.update);
router.delete('/blog-categories/:id', auth, restrictTo('ADMIN'), blogCategoryController.remove);

// Blog Routes - Public
router.get('/blogs', blogController.list); // Public with filtering and pagination
router.get('/blogs/:slug', blogController.getBySlug); // Public

router.get('/blogs/related', blogController.getRelated); // Public




// Blog Routes - Admin
router.get('/admin/blogs', auth, restrictTo('ADMIN'), blogController.getAdminBlogs);
router.post('/blogs', auth, restrictTo('ADMIN'), blogController.create);
router.put('/blogs/:id', auth, restrictTo('ADMIN'), blogController.update);
router.delete('/blogs/:id', auth, restrictTo('ADMIN'), blogController.remove);
router.get('/admin/blogs/:id',  blogController.getBlogById);

module.exports = router;