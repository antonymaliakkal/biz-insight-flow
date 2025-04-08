
const asyncHandler = require('express-async-handler');
const customerService = require('../services/customerService');

// @desc    Create a customer
// @route   POST /api/customers
// @access  Private
const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body, req.user._id);
  res.status(201).json(customer);
});

// @desc    Get all customers (admin)
// @route   GET /api/customers/all
// @access  Private/Admin
const getAllCustomers = asyncHandler(async (req, res) => {
  const customers = await customerService.getAllCustomers();
  res.json(customers);
});

// @desc    Get user customers
// @route   GET /api/customers
// @access  Private
const getUserCustomers = asyncHandler(async (req, res) => {
  const customers = await customerService.getUserCustomers(req.user._id);
  res.json(customers);
});

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  
  // Check if user has access to this customer
  if (
    req.user.role !== 'admin' &&
    customer.user.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to access this customer');
  }
  
  res.json(customer);
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.json(customer);
});

// @desc    Add purchase to customer history
// @route   POST /api/customers/:id/purchases
// @access  Private
const addPurchaseToHistory = asyncHandler(async (req, res) => {
  const customer = await customerService.addPurchaseToHistory(req.params.id, req.body);
  res.json(customer);
});

// @desc    Add next service to customer
// @route   POST /api/customers/:id/services
// @access  Private
const addNextService = asyncHandler(async (req, res) => {
  const customer = await customerService.addNextService(req.params.id, req.body);
  res.json(customer);
});

// @desc    Update next service
// @route   PUT /api/customers/:id/services/:serviceId
// @access  Private
const updateNextService = asyncHandler(async (req, res) => {
  const customer = await customerService.updateNextService(
    req.params.id,
    req.params.serviceId,
    req.body
  );
  res.json(customer);
});

// @desc    Remove next service
// @route   DELETE /api/customers/:id/services/:serviceId
// @access  Private
const removeNextService = asyncHandler(async (req, res) => {
  const customer = await customerService.removeNextService(
    req.params.id,
    req.params.serviceId
  );
  res.json(customer);
});

module.exports = {
  createCustomer,
  getAllCustomers,
  getUserCustomers,
  getCustomerById,
  updateCustomer,
  addPurchaseToHistory,
  addNextService,
  updateNextService,
  removeNextService,
};
