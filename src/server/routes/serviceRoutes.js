
const express = require('express');
const router = express.Router();
const {
  createService,
  getAllServices,
  getUserServices,
  getServiceById,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const { protect, admin, checkOwnership } = require('../middleware/authMiddleware');
const Service = require('../models/serviceModel');

// Protected routes
router.route('/')
  .post(protect, createService)
  .get(protect, getUserServices);

// Admin routes
router.get('/all', protect, admin, getAllServices);

// Service specific routes
router.route('/:id')
  .get(protect, getServiceById)
  .put(protect, checkOwnership(Service), updateService)
  .delete(protect, checkOwnership(Service), deleteService);

module.exports = router;
