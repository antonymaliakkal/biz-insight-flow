
const Product = require('../models/productModel');

// Create product
const createProduct = async (productData, userId) => {
  const { name, description, price, sku, consumables } = productData;

  const product = new Product({
    user: userId,
    name,
    description,
    price,
    sku,
    consumables: consumables || [],
  });

  const createdProduct = await product.save();
  return createdProduct;
};

// Get all products (admin)
const getAllProducts = async () => {
  return await Product.find({}).populate('user', 'name email');
};

// Get user products
const getUserProducts = async (userId) => {
  return await Product.find({ user: userId });
};

// Get product by ID
const getProductById = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};

// Update product
const updateProduct = async (id, productData) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error('Product not found');
  }

  // Update product fields
  Object.keys(productData).forEach((key) => {
    // Special handling for consumables to avoid overwriting the entire array
    if (key === 'consumables' && Array.isArray(productData.consumables)) {
      // Clear existing consumables and add new ones
      product.consumables = productData.consumables;
    } else {
      product[key] = productData[key];
    }
  });

  const updatedProduct = await product.save();
  return updatedProduct;
};

// Delete product
const deleteProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error('Product not found');
  }

  await product.remove();
  return { message: 'Product removed' };
};

// Add consumable to product
const addConsumable = async (productId, consumableData) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  product.consumables.push(consumableData);
  const updatedProduct = await product.save();
  return updatedProduct;
};

// Update consumable in product
const updateConsumable = async (productId, consumableId, consumableData) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  const consumableIndex = product.consumables.findIndex(
    c => c._id.toString() === consumableId
  );

  if (consumableIndex === -1) {
    throw new Error('Consumable not found');
  }

  // Update consumable fields
  Object.keys(consumableData).forEach((key) => {
    product.consumables[consumableIndex][key] = consumableData[key];
  });

  const updatedProduct = await product.save();
  return updatedProduct;
};

// Remove consumable from product
const removeConsumable = async (productId, consumableId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new Error('Product not found');
  }

  product.consumables = product.consumables.filter(
    c => c._id.toString() !== consumableId
  );

  const updatedProduct = await product.save();
  return updatedProduct;
};

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
