const logger = require('../utils/logger');

const authenticateRequest = (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        logger.warn('access attemept without user ID');
        return res.status(401).json({ success: false, message: 'Authentication failed: No user ID provided' });
    }

    req.user = {userId};

    next();
}

module.exports = {
    authenticateRequest
};