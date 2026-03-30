const fs = require('fs').promises
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const asyncHandler = require('express-async-handler')
const User = require('../models/userModel')

const getSessionFilePath = () => {
  const configuredPath = process.env.MCP_AUTH_SESSION_FILE
  const fallbackPath = path.join(__dirname, '..', '..', '.mcp-auth-session.json')

  if (!configuredPath) {
    return fallbackPath
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(__dirname, '..', '..', configuredPath)
}

const writeMcpSession = async (user, token) => {
  const sessionFilePath = getSessionFilePath()

  await fs.mkdir(path.dirname(sessionFilePath), { recursive: true })
  await fs.writeFile(
    sessionFilePath,
    JSON.stringify(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          token,
        },
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  )
}

const clearMcpSessionFile = async () => {
  const sessionFilePath = getSessionFilePath()

  try {
    await fs.unlink(sessionFilePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Please add all fields')
  }

  // Check if user exists
  const userExists = await User.findOne({ email })

  if (userExists) {
    res.status(400)
    throw new Error('User already exists')
  }

  // Hash password
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  })

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    })
  } else {
    res.status(400)
    throw new Error('Invalid user data')
  }
})

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Check for user email
  const user = await User.findOne({ email })

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    })
  } else {
    res.status(400)
    throw new Error('Invalid credentials')
  }
})

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(req.user)
})

// @desc    Sync current web session to MCP bridge file
// @route   POST /api/users/mcp-session
// @access  Private
const syncMcpSession = asyncHandler(async (req, res) => {
  await writeMcpSession(req.user, req.token)

  res.status(200).json({
    message: 'MCP session synchronized',
    sessionFile: getSessionFilePath(),
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  })
})

// @desc    Clear current MCP bridge file
// @route   DELETE /api/users/mcp-session
// @access  Private
const clearMcpSession = asyncHandler(async (req, res) => {
  await clearMcpSessionFile()

  res.status(200).json({
    message: 'MCP session cleared',
  })
})

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  })
}

module.exports = {
  registerUser,
  loginUser,
  getMe,
  syncMcpSession,
  clearMcpSession,
}
