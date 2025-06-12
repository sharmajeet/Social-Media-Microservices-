 const logger = require('../utils/logger');

 const errorHandler = (err, req, res, next) => {
        // Log the error
        logger.error(err.message, { stack: err.stack });
    
        // Set the response status code
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Internal Server Error',
        });
}

module.exports = errorHandler;