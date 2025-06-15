const logger = require('../utils/logger');
require('dotenv').config();
const mongoose = require('mongoose');

const connect = async () => {
    try {
        const dbUri = process.env.MONGO_URI;
        if (!dbUri) {
            logger.warn('MONGO_URI is not defined in environment variables');
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        await mongoose.connect(dbUri);
        logger.info('Connected to MongoDB successfully');
    } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`, { stack: error.stack });
        throw error;
    }
};

module.exports = { connect };
