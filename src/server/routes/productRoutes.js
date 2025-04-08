
const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getUserProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addConsumable,
  updateConsumable,
  removeConsumable,
} = require('../controllers/productController');
const { protect, admin, checkOwnership } = require('../middleware/authMiddleware');
const Product = require('../models/productModel');

// Protected routes
router.route('/')
  .post(protect, createProduct)
  .get(protect, getUserProducts);

// Admin routes
router.get('/all', protect, admin, getAllProducts);

// Product specific routes
router.route('/:id')
  .get(protect, getProductById)
  .put(protect, checkOwnership(Product), updateProduct)
  .delete(protect, checkOwnership(Product), deleteProduct);

// Consumables routes
router.route('/:id/consumables')
  .post(protect, checkOwnership(Product), addConsumable);

router.route('/:id/consumables/:consumableId')
  .put(protect, checkOwnership(Product), updateConsumable)
  .delete(protect, checkOwnership(Product), removeConsumable);

module.exports = router;
