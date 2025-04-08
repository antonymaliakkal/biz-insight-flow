
const asyncHandler = require('express-async-handler');
const serviceService = require('../services/serviceService');

// @desc    Create a service
// @route   POST /api/services
// @access  Private
const createService = asyncHandler(async (req, res) => {
  const service = await serviceService.createService(req.body, req.user._id);
  res.status(201).json(service);
});

// @desc    Get all services (admin)
// @route   GET /api/services/all
// @access  Private/Admin
const getAllServices = asyncHandler(async (req, res) => {
  const services = await serviceService.getAllServices();
  res.json(services);
});

// @desc    Get user services
// @route   GET /api/services
// @access  Private
const getUserServices = asyncHandler(async (req, res) => {
  const services = await serviceService.getUserServices(req.user._id);
  res.json(services);
});

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Private
const getServiceById = asyncHandler(async (req, res) => {
  const service = await serviceService.getServiceById(req.params.id);
  
  // Check if user has access to this service
  if (
    req.user.role !== 'admin' &&
    service.user.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to access this service');
  }
  
  res.json(service);
});

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private
const updateService = asyncHandler(async (req, res) => {
  const service = await serviceService.updateService(req.params.id, req.body);
  res.json(service);
});

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private
const deleteService = asyncHandler(async (req, res) => {
  const result = await serviceService.deleteService(req.params.id);
  res.json(result);
});

module.exports = {
  createService,
  getAllServices,
  getUserServices,
  getServiceById,
  updateService,
  deleteService,
};
