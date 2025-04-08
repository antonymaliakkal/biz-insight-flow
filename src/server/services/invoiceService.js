
const Invoice = require('../models/invoiceModel');
const Customer = require('../models/customerModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sendEmail = require('../utils/emailService');

// Generate unique invoice number
const generateInvoiceNumber = async () => {
  const prefix = 'INV';
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get the latest invoice
  const latestInvoice = await Invoice.findOne().sort('-createdAt');
  let sequentialNumber = 1;
  
  if (latestInvoice) {
    // Extract the sequential number from the latest invoice number
    const latestNumber = latestInvoice.invoiceNumber;
    const matches = latestNumber.match(/(\d+)$/);
    if (matches && matches[1]) {
      sequentialNumber = parseInt(matches[1]) + 1;
    }
  }
  
  // Format the sequential number with leading zeros
  const formattedNumber = sequentialNumber.toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${formattedNumber}`;
};

// Create invoice
const createInvoice = async (invoiceData, userId) => {
  const {
    customerId,
    items,
    taxRate,
    discountType,
    discountValue,
    notes,
    tyreChange,
    nextServiceDate,
    dueDate,
  } = invoiceData;

  // Validate customer
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  // Calculate subtotal, tax, discount, and total
  let subtotal = 0;
  
  // Process and validate items
  const processedItems = await Promise.all(
    items.map(async (item) => {
      let itemModel;
      
      if (item.itemType === 'product') {
        itemModel = await Product.findById(item.itemId);
      } else if (item.itemType === 'service') {
        itemModel = await Service.findById(item.itemId);
      }
      
      if (!itemModel) {
        throw new Error(`${item.itemType} with ID ${item.itemId} not found`);
      }
      
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      return {
        itemType: item.itemType,
        itemId: item.itemId,
        name: itemModel.name,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal,
      };
    })
  );

  // Calculate tax amount
  const taxAmount = (subtotal * (taxRate / 100)).toFixed(2);
  
  // Calculate discount amount
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * (discountValue / 100)).toFixed(2);
  } else if (discountType === 'fixed') {
    discountAmount = discountValue;
  }
  
  // Calculate total
  const total = (subtotal - discountAmount + parseFloat(taxAmount)).toFixed(2);
  
  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();
  
  // Create the invoice
  const invoice = new Invoice({
    user: userId,
    customer: customerId,
    invoiceNumber,
    date: new Date(),
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    items: processedItems,
    subtotal,
    taxRate,
    taxAmount,
    discountType,
    discountValue,
    discountAmount,
    total,
    notes,
    tyreChange: tyreChange || { frontLeft: false, frontRight: false, rearLeft: false, rearRight: false },
    nextServiceDate,
    status: 'draft',
  });
  
  const createdInvoice = await invoice.save();
  
  // Add to customer's purchase history
  await Customer.findByIdAndUpdate(customerId, {
    $push: {
      purchaseHistory: {
        invoiceId: createdInvoice._id,
        date: new Date(),
        amount: total,
      },
    },
  });
  
  // Add next service date if provided
  if (nextServiceDate) {
    // Find service in the invoice items
    const serviceItem = processedItems.find(item => item.itemType === 'service');
    
    if (serviceItem) {
      await Customer.findByIdAndUpdate(customerId, {
        $push: {
          nextServices: {
            serviceId: serviceItem.itemId,
            serviceName: serviceItem.name,
            date: nextServiceDate,
            notes: `Scheduled from Invoice #${invoiceNumber}`,
          },
        },
      });
    }
  }
  
  return createdInvoice;
};

// Get all invoices (admin)
const getAllInvoices = async () => {
  return await Invoice.find({})
    .populate('user', 'name email')
    .populate('customer', 'name email phone');
};

// Get user invoices
const getUserInvoices = async (userId) => {
  return await Invoice.find({ user: userId })
    .populate('customer', 'name email phone');
};

// Get invoice by ID
const getInvoiceById = async (id) => {
  const invoice = await Invoice.findById(id)
    .populate('user', 'name email')
    .populate('customer', 'name email phone address')
    .populate({
      path: 'items.itemId',
      select: 'name description price',
    });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  return invoice;
};

// Update invoice
const updateInvoice = async (id, invoiceData) => {
  const invoice = await Invoice.findById(id);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Only allow updating certain fields if the invoice is not paid
  if (invoice.status === 'paid') {
    throw new Error('Cannot update a paid invoice');
  }

  // Update invoice fields
  Object.keys(invoiceData).forEach((key) => {
    // Don't allow changing the customer or invoice number
    if (key !== 'customer' && key !== 'invoiceNumber' && key !== 'user') {
      invoice[key] = invoiceData[key];
    }
  });

  // Recalculate totals if items, tax, or discount changed
  if (invoiceData.items || invoiceData.taxRate || invoiceData.discountValue || invoiceData.discountType) {
    let subtotal = 0;
    
    // If items were updated, calculate new subtotal
    if (invoiceData.items) {
      invoice.items.forEach(item => {
        subtotal += item.total;
      });
      invoice.subtotal = subtotal;
    } else {
      subtotal = invoice.subtotal;
    }
    
    // Recalculate tax
    if (invoiceData.taxRate) {
      invoice.taxAmount = (subtotal * (invoice.taxRate / 100)).toFixed(2);
    }
    
    // Recalculate discount
    if (invoiceData.discountValue || invoiceData.discountType) {
      if (invoice.discountType === 'percentage') {
        invoice.discountAmount = (subtotal * (invoice.discountValue / 100)).toFixed(2);
      } else {
        invoice.discountAmount = invoice.discountValue;
      }
    }
    
    // Recalculate total
    invoice.total = (subtotal - invoice.discountAmount + parseFloat(invoice.taxAmount)).toFixed(2);
  }

  const updatedInvoice = await invoice.save();
  return updatedInvoice;
};

// Delete invoice
const deleteInvoice = async (id) => {
  const invoice = await Invoice.findById(id);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Only allow deleting draft invoices
  if (invoice.status !== 'draft') {
    throw new Error('Only draft invoices can be deleted');
  }

  await invoice.remove();
  return { message: 'Invoice removed' };
};

// Generate PDF invoice
const generatePDF = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate('user', 'name email')
    .populate('customer', 'name email phone address')
    .populate({
      path: 'items.itemId',
      select: 'name description price',
    });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Create a new PDF document
  const doc = new PDFDocument({ margin: 50 });
  
  // Set up the file path for saving the PDF
  const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  
  // Ensure the temp directory exists
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create a write stream to save the PDF
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Add company logo (if available)
  // doc.image('path/to/logo.png', 50, 45, { width: 50 });
  
  // Add company information
  doc.fontSize(20).text('Your Company Name', 50, 50);
  doc.fontSize(10).text('123 Business Street, City, Country', 50, 75);
  doc.text('Phone: (123) 456-7890', 50, 90);
  doc.text('Email: info@yourcompany.com', 50, 105);
  
  // Add line
  doc.moveTo(50, 130).lineTo(550, 130).stroke();
  
  // Add invoice header
  doc.fontSize(16).text('INVOICE', 50, 150);
  doc.fontSize(10).text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 175);
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 50, 190);
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, 205);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 50, 220);
  
  // Add customer information
  doc.fontSize(12).text('Bill To:', 300, 150);
  doc.fontSize(10).text(`${invoice.customer.name}`, 300, 175);
  doc.text(`${invoice.customer.email}`, 300, 190);
  doc.text(`${invoice.customer.phone || 'No phone provided'}`, 300, 205);
  
  if (invoice.customer.address) {
    const address = invoice.customer.address;
    const addressStr = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country,
    ].filter(Boolean).join(', ');
    doc.text(addressStr, 300, 220, { width: 250 });
  }
  
  // Add invoice items table
  doc.fontSize(12).text('Items', 50, 270);
  
  // Table headers
  doc.fontSize(10)
    .text('Item', 50, 290)
    .text('Type', 200, 290)
    .text('Quantity', 280, 290)
    .text('Price', 350, 290)
    .text('Total', 420, 290);
  
  doc.moveTo(50, 305).lineTo(550, 305).stroke();
  
  // Table rows
  let y = 320;
  invoice.items.forEach((item, index) => {
    doc.text(item.name, 50, y)
      .text(item.itemType, 200, y)
      .text(item.quantity.toString(), 280, y)
      .text(`$${item.price.toFixed(2)}`, 350, y)
      .text(`$${item.total.toFixed(2)}`, 420, y);
    
    y += 20;
    
    // Add a new page if needed
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  });
  
  // Add line
  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 20;
  
  // Add totals
  doc.text('Subtotal:', 350, y).text(`$${invoice.subtotal.toFixed(2)}`, 420, y);
  y += 20;
  
  if (invoice.discountAmount > 0) {
    const discountText = invoice.discountType === 'percentage'
      ? `Discount (${invoice.discountValue}%):`
      : 'Discount:';
    doc.text(discountText, 350, y).text(`-$${invoice.discountAmount.toFixed(2)}`, 420, y);
    y += 20;
  }
  
  doc.text(`Tax (${invoice.taxRate}%):`, 350, y).text(`$${invoice.taxAmount}`, 420, y);
  y += 20;
  
  doc.fontSize(12).text('Total:', 350, y).text(`$${invoice.total}`, 420, y);
  y += 40;
  
  // Add notes
  if (invoice.notes) {
    doc.fontSize(12).text('Notes:', 50, y);
    y += 20;
    doc.fontSize(10).text(invoice.notes, 50, y, { width: 500 });
    y += 60;
  }
  
  // Add tyre change visualization if applicable
  if (invoice.tyreChange &&
      (invoice.tyreChange.frontLeft || invoice.tyreChange.frontRight ||
       invoice.tyreChange.rearLeft || invoice.tyreChange.rearRight)) {
    
    doc.fontSize(12).text('Tyre Change Visualization:', 50, y);
    y += 20;
    
    // Draw car outline (simplified)
    const carX = 150;
    const carY = y;
    const carWidth = 300;
    const carHeight = 150;
    
    // Car body
    doc.rect(carX, carY, carWidth, carHeight).stroke();
    
    // Wheels
    const wheelRadius = 20;
    const wheelOffset = 30;
    
    // Front Left
    doc.circle(carX + wheelOffset, carY + wheelOffset, wheelRadius).stroke();
    if (invoice.tyreChange.frontLeft) {
      doc.circle(carX + wheelOffset, carY + wheelOffset, wheelRadius - 5).fill('gray');
    }
    doc.text('FL', carX + wheelOffset - 5, carY + wheelOffset - 5);
    
    // Front Right
    doc.circle(carX + carWidth - wheelOffset, carY + wheelOffset, wheelRadius).stroke();
    if (invoice.tyreChange.frontRight) {
      doc.circle(carX + carWidth - wheelOffset, carY + wheelOffset, wheelRadius - 5).fill('gray');
    }
    doc.text('FR', carX + carWidth - wheelOffset - 5, carY + wheelOffset - 5);
    
    // Rear Left
    doc.circle(carX + wheelOffset, carY + carHeight - wheelOffset, wheelRadius).stroke();
    if (invoice.tyreChange.rearLeft) {
      doc.circle(carX + wheelOffset, carY + carHeight - wheelOffset, wheelRadius - 5).fill('gray');
    }
    doc.text('RL', carX + wheelOffset - 5, carY + carHeight - wheelOffset - 5);
    
    // Rear Right
    doc.circle(carX + carWidth - wheelOffset, carY + carHeight - wheelOffset, wheelRadius).stroke();
    if (invoice.tyreChange.rearRight) {
      doc.circle(carX + carWidth - wheelOffset, carY + carHeight - wheelOffset, wheelRadius - 5).fill('gray');
    }
    doc.text('RR', carX + carWidth - wheelOffset - 5, carY + carHeight - wheelOffset - 5);
    
    // Legend
    y += carHeight + 20;
    doc.rect(50, y, 15, 15).fill('gray');
    doc.text('Changed Tyre', 70, y);
  }
  
  // Add footer
  const footerY = doc.page.height - 50;
  doc.fontSize(10).text('Thank you for your business!', 50, footerY, { align: 'center' });
  
  // Finalize the PDF
  doc.end();
  
  // Return a promise that resolves when the PDF is written
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve({ filePath, fileName });
    });
    
    stream.on('error', reject);
  });
};

// Send invoice via email
const sendInvoiceEmail = async (invoiceId, emailData) => {
  const { filePath, fileName } = await generatePDF(invoiceId);
  const invoice = await Invoice.findById(invoiceId)
    .populate('customer', 'name email');
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  const subject = emailData.subject || `Invoice #${invoice.invoiceNumber}`;
  const message = emailData.message || 'Please find attached your invoice.';
  
  try {
    await sendEmail({
      email: invoice.customer.email,
      subject,
      text: message,
      html: `
        <h1>Invoice #${invoice.invoiceNumber}</h1>
        <p>${message}</p>
        <p>Total Amount: $${invoice.total}</p>
        <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      `,
      attachments: [
        {
          filename: fileName,
          path: filePath,
          contentType: 'application/pdf',
        },
      ],
    });
    
    // Update invoice status to 'sent'
    invoice.status = 'sent';
    await invoice.save();
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
    
    return { success: true, message: 'Invoice sent successfully' };
  } catch (error) {
    // Clean up the temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`Failed to send invoice: ${error.message}`);
  }
};

// Update invoice status
const updateInvoiceStatus = async (id, status) => {
  const invoice = await Invoice.findById(id);
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  invoice.status = status;
  const updatedInvoice = await invoice.save();
  return updatedInvoice;
};

// Get invoice analytics
const getInvoiceAnalytics = async (userId, role, dateRange) => {
  const { startDate, endDate } = dateRange || {
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  };
  
  // Base query for filtering by date range
  const dateQuery = {
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  };
  
  // Add user filter if not admin
  const userQuery = role === 'admin' ? {} : { user: userId };
  
  // Combine queries
  const query = { ...dateQuery, ...userQuery };
  
  // Get total sales and invoices
  const invoices = await Invoice.find(query);
  const totalInvoices = invoices.length;
  const totalSales = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  
  // Get outstanding payments
  const outstandingInvoices = invoices.filter(inv => inv.status !== 'paid');
  const outstandingAmount = outstandingInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  
  // Get sales by item (product/service)
  const salesByItem = [];
  const itemsMap = new Map();
  
  invoices.forEach(invoice => {
    invoice.items.forEach(item => {
      const key = `${item.itemType}-${item.itemId}`;
      if (itemsMap.has(key)) {
        const existing = itemsMap.get(key);
        existing.quantity += item.quantity;
        existing.total += item.total;
      } else {
        itemsMap.set(key, {
          itemId: item.itemId,
          itemType: item.itemType,
          name: item.name,
          quantity: item.quantity,
          total: item.total,
        });
      }
    });
  });
  
  itemsMap.forEach(value => {
    salesByItem.push(value);
  });
  
  // Sort by sales volume (highest to lowest)
  salesByItem.sort((a, b) => b.total - a.total);
  
  // Get top 5 most sold items and bottom 5 least sold items
  const mostSoldItems = salesByItem.slice(0, 5);
  const leastSoldItems = salesByItem.slice(-5).reverse();
  
  // Get sales trends by month
  const salesByMonth = {};
  
  invoices.forEach(invoice => {
    const date = new Date(invoice.date);
    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
    
    if (!salesByMonth[monthYear]) {
      salesByMonth[monthYear] = {
        month: monthYear,
        total: 0,
        count: 0,
      };
    }
    
    salesByMonth[monthYear].total += Number(invoice.total);
    salesByMonth[monthYear].count += 1;
  });
  
  const salesTrends = Object.values(salesByMonth);
  
  return {
    totalSales,
    totalInvoices,
    outstandingAmount,
    outstandingInvoices: outstandingInvoices.length,
    mostSoldItems,
    leastSoldItems,
    salesTrends,
  };
};

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
