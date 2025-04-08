
const Service = require('../models/serviceModel');

// Create service
const createService = async (serviceData, userId) => {
  const { name, description, price, duration, durationType } = serviceData;

  const service = new Service({
    user: userId,
    name,
    description,
    price,
    duration,
    durationType: durationType || 'minutes',
  });

  const createdService = await service.save();
  return createdService;
};

// Get all services (admin)
const getAllServices = async () => {
  return await Service.find({}).populate('user', 'name email');
};

// Get user services
const getUserServices = async (userId) => {
  return await Service.find({ user: userId });
};

// Get service by ID
const getServiceById = async (id) => {
  const service = await Service.findById(id);

  if (!service) {
    throw new Error('Service not found');
  }

  return service;
};

// Update service
const updateService = async (id, serviceData) => {
  const service = await Service.findById(id);

  if (!service) {
    throw new Error('Service not found');
  }

  // Update service fields
  Object.keys(serviceData).forEach((key) => {
    service[key] = serviceData[key];
  });

  const updatedService = await service.save();
  return updatedService;
};

// Delete service
const deleteService = async (id) => {
  const service = await Service.findById(id);

  if (!service) {
    throw new Error('Service not found');
  }

  await service.remove();
  return { message: 'Service removed' };
};

module.exports = {
  createService,
  getAllServices,
  getUserServices,
  getServiceById,
  updateService,
  deleteService,
};
