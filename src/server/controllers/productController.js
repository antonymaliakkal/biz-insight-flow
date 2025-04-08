
const asyncHandler = require('express-async-handler');
const productService = require('../services/productService');

// @desc    Create a product
// @route   POST /api/products
// @access  Private
const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user._id);
  res.status(201).json(product);
});

// @desc    Get all products (admin)
// @route   GET /api/products/all
// @access  Private/Admin
const getAllProducts = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts();
  res.json(products);
});

// @desc    Get user products
// @route   GET /api/products
// @access  Private
const getUserProducts = asyncHandler(async (req, res) => {
  const products = await productService.getUserProducts(req.user._id);
  res.json(products);
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  
  // Check if user has access to this product
  if (
    req.user.role !== 'admin' &&
    product.user.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to access this product');
  }
  
  res.json(product);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json(product);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);
  res.json(result);
});

// @desc    Add consumable to product
// @route   POST /api/products/:id/consumables
// @access  Private
const addConsumable = asyncHandler(async (req, res) => {
  const product = await productService.addConsumable(req.params.id, req.body);
  res.json(product);
});

// @desc    Update consumable in product
// @route   PUT /api/products/:id/consumables/:consumableId
// @access  Private
const updateConsumable = asyncHandler(async (req, res) => {
  const product = await productService.updateConsumable(
    req.params.id,
    req.params.consumableId,
    req.body
  );
  res.json(product);
});

// @desc    Remove consumable from product
// @route   DELETE /api/products/:id/consumables/:consumableId
// @access  Private
const removeConsumable = asyncHandler(async (req, res) => {
  const product = await productService.removeConsumable(
    req.params.id,
    req.params.consumableId
  );
  res.json(product);
});

module.exports = {
  createProduct,
  getAllProducts,
  getUserProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addConsumable,
  updateConsumable,
  removeConsumable,
};
