
const asyncHandler = require('express-async-handler');
const invoiceService = require('../services/invoiceService');

// @desc    Create an invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.body, req.user._id);
  res.status(201).json(invoice);
});

// @desc    Get all invoices (admin)
// @route   GET /api/invoices/all
// @access  Private/Admin
const getAllInvoices = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.getAllInvoices();
  res.json(invoices);
});

// @desc    Get user invoices
// @route   GET /api/invoices
// @access  Private
const getUserInvoices = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.getUserInvoices(req.user._id);
  res.json(invoices);
});

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id);
  
  // Check if user has access to this invoice
  if (
    req.user.role !== 'admin' &&
    invoice.user._id.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error('Not authorized to access this invoice');
  }
  
  res.json(invoice);
});

// @desc    Update an invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
  res.json(invoice);
});

// @desc    Delete an invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = asyncHandler(async (req, res) => {
  const result = await invoiceService.deleteInvoice(req.params.id);
  res.json(result);
});

// @desc    Generate PDF invoice
// @route   GET /api/invoices/:id/pdf
// @access  Private
const generatePDF = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await invoiceService.generatePDF(req.params.id);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  
  // Send the file and then delete it after sending
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(err);
    }
    // Delete the temp file after sending
    const fs = require('fs');
    fs.unlinkSync(filePath);
  });
});

// @desc    Send invoice via email
// @route   POST /api/invoices/:id/email
// @access  Private
const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const result = await invoiceService.sendInvoiceEmail(req.params.id, req.body);
  res.json(result);
});

// @desc    Update invoice status
// @route   PUT /api/invoices/:id/status
// @access  Private
const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const invoice = await invoiceService.updateInvoiceStatus(req.params.id, status);
  res.json(invoice);
});

// @desc    Get invoice analytics
// @route   GET /api/invoices/analytics
// @access  Private
const getInvoiceAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateRange = null;
  if (startDate && endDate) {
    dateRange = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  }
  
  const analytics = await invoiceService.getInvoiceAnalytics(
    req.user._id,
    req.user.role,
    dateRange
  );
  
  res.json(analytics);
});

module.exports = {
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
};
