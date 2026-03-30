const express = require('express')
const router = express.Router()
const {
  registerUser,
  loginUser,
  getMe,
  syncMcpSession,
  clearMcpSession,
} = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

router.post('/', registerUser)
router.post('/login', loginUser)
router.get('/me', protect, getMe)
router.post('/mcp-session', protect, syncMcpSession)
router.delete('/mcp-session', protect, clearMcpSession)

module.exports = router
