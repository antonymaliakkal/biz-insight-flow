
const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getAllInvoices,
  getUserInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  generatePDF,
  sendInvoiceEmail,
  updateInvoiceStatus,
  getInvoiceAnalytics,
} = require('../controllers/invoiceController');
const { protect, admin, checkOwnership } = require('../middleware/authMiddleware');
const Invoice = require('../models/invoiceModel');

// Protected routes
router.route('/')
  .post(protect, createInvoice)
  .get(protect, getUserInvoices);

// Analytics routes
router.get('/analytics', protect, getInvoiceAnalytics);

// Admin routes
router.get('/all', protect, admin, getAllInvoices);

// Invoice specific routes
router.route('/:id')
  .get(protect, getInvoiceById)
  .put(protect, checkOwnership(Invoice), updateInvoice)
  .delete(protect, checkOwnership(Invoice), deleteInvoice);

// PDF generation route
router.get('/:id/pdf', protect, generatePDF);

// Email route
router.post('/:id/email', protect, checkOwnership(Invoice), sendInvoiceEmail);

// Status update route
router.put('/:id/status', protect, checkOwnership(Invoice), updateInvoiceStatus);

module.exports = router;
