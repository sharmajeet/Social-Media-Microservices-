const express = require("express");
const multer = require("multer");

const logger = require("../utils/logger");
const { uploadMedia } = require("../controllers/media-controller");
const { authenticateRequest } = require("../middlewares/auth-middleware");

const router = express.Router();

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
}).single("file");

// Simple file validation middleware
const validateFile = (req, res, next) => {
  if (!req.file) {
    logger.warn("No file uploaded");
    return res.status(400).json({ 
      success: false, 
      message: "No file found!" 
    });
  }
  logger.info("Received media upload request");
  next();
};

router.post(
  "/upload",
  authenticateRequest,
  upload,
  validateFile,     
  uploadMedia       
);

module.exports = router;