const express = require('express');
const router = express.Router();
const { chatWithLLM } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, chatWithLLM);

module.exports = router;
