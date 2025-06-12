const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');


const authenticateRequest = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        logger.warn('Access attempt without token');
        return res.status(401).json({ success: false, message: 'Authentication failed: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Authentication failed:', error);
        res.status(401).json({ success: false, message: 'Authentication failed: Invalid token' });
    }
}

module.exports = {
    authenticateRequest
};