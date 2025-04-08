
const Customer = require('../models/customerModel');

// Create customer
const createCustomer = async (customerData, userId) => {
  const { name, email, phone, address } = customerData;

  const customer = new Customer({
    user: userId,
    name,
    email,
    phone,
    address,
    purchaseHistory: [],
    nextServices: [],
  });

  const createdCustomer = await customer.save();
  return createdCustomer;
};

// Get all customers (admin)
const getAllCustomers = async () => {
  return await Customer.find({}).populate('user', 'name email');
};

// Get user customers
const getUserCustomers = async (userId) => {
  return await Customer.find({ user: userId });
};

// Get customer by ID
const getCustomerById = async (id) => {
  const customer = await Customer.findById(id)
    .populate({
      path: 'nextServices.serviceId',
      select: 'name description price duration',
    })
    .populate({
      path: 'purchaseHistory.invoiceId',
      select: 'invoiceNumber date total status',
    });

  if (!customer) {
    throw new Error('Customer not found');
  }

  return customer;
};

// Update customer
const updateCustomer = async (id, customerData) => {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Update customer fields
  Object.keys(customerData).forEach((key) => {
    if (key !== 'purchaseHistory' && key !== 'nextServices') {
      customer[key] = customerData[key];
    }
  });

  const updatedCustomer = await customer.save();
  return updatedCustomer;
};

// Add purchase to customer history
const addPurchaseToHistory = async (customerId, purchaseData) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  customer.purchaseHistory.push(purchaseData);
  const updatedCustomer = await customer.save();
  return updatedCustomer;
};

// Add next service to customer
const addNextService = async (customerId, serviceData) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  customer.nextServices.push(serviceData);
  const updatedCustomer = await customer.save();
  return updatedCustomer;
};

// Update next service
const updateNextService = async (customerId, serviceId, serviceData) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  const serviceIndex = customer.nextServices.findIndex(
    s => s._id.toString() === serviceId
  );

  if (serviceIndex === -1) {
    throw new Error('Service not found');
  }

  // Update service fields
  Object.keys(serviceData).forEach((key) => {
    customer.nextServices[serviceIndex][key] = serviceData[key];
  });

  const updatedCustomer = await customer.save();
  return updatedCustomer;
};

// Remove next service
const removeNextService = async (customerId, serviceId) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  customer.nextServices = customer.nextServices.filter(
    s => s._id.toString() !== serviceId
  );

  const updatedCustomer = await customer.save();
  return updatedCustomer;
};

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
