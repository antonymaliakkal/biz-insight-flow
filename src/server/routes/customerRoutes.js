
const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  getUserCustomers,
  getCustomerById,
  updateCustomer,
  addPurchaseToHistory,
  addNextService,
  updateNextService,
  removeNextService,
} = require('../controllers/customerController');
const { protect, admin, checkOwnership } = require('../middleware/authMiddleware');
const Customer = require('../models/customerModel');

// Protected routes
router.route('/')
  .post(protect, createCustomer)
  .get(protect, getUserCustomers);

// Admin routes
router.get('/all', protect, admin, getAllCustomers);

// Customer specific routes
router.route('/:id')
  .get(protect, getCustomerById)
  .put(protect, checkOwnership(Customer), updateCustomer);

// Customer purchase history routes
router.route('/:id/purchases')
  .post(protect, checkOwnership(Customer), addPurchaseToHistory);

// Customer next service routes
router.route('/:id/services')
  .post(protect, checkOwnership(Customer), addNextService);

router.route('/:id/services/:serviceId')
  .put(protect, checkOwnership(Customer), updateNextService)
  .delete(protect, checkOwnership(Customer), removeNextService);

module.exports = router;
