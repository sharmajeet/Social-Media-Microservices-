const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Error:', err);

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'File size too large. Maximum size is 5MB.'
        });
    }

    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    // MongoDB errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.errors
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid ID format'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;