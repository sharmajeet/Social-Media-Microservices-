const express = require('express');
const searchPostController = require('../controllers/search-controller');
const {authenticateRequest}  = require('../middlewares/auth-middleware');
const router = express.Router();

router.use(authenticateRequest);

router.get('/post', searchPostController);

module.exports = router;