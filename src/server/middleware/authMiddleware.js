
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as admin');
  }
};

const checkOwnership = (model) => async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const item = await model.findById(itemId);
    
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }

    // Admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // For regular users, check if they are the owner
    if (item.user && item.user.toString() === req.user._id.toString()) {
      return next();
    }

    res.status(403);
    throw new Error('Not authorized to access this resource');
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, admin, checkOwnership };
