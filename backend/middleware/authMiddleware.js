const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')
const User = require('../models/userModel')

const protect = asyncHandler(async (req, res, next) => {
  let token

  // 1. Check for Server-to-Server Internal Auth Header (MCP Subprocess)
  const serverApiKey = req.headers['x-server-api-key'];
  if (serverApiKey && serverApiKey === (process.env.SERVER_API_KEY || 'goalsetter_internal_mcp_key_99x')) {
    const actingUserId = req.headers['x-acting-for-user'];
    if (!actingUserId) {
        res.status(401);
        throw new Error('Server request missing acting user ID');
    }
    
    req.user = await User.findById(actingUserId).select('-password');
    if (!req.user) {
        res.status(401);
        throw new Error('User not found for server request');
    }
    
    return next(); // Bypass JWT validation completely!
  }

  // 2. Standard Client JWT Validation (React Frontend)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1]
      req.token = token

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password')

      return next()
    } catch (error) {
      res.status(401)
      throw new Error('Not authorized')
    }
  }

  if (!token) {
    res.status(401)
    throw new Error('Not authorized, no token')
  }
})

module.exports = { protect }
