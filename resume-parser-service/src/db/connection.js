const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info('MongoDB connected successfully');
        
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

    } catch (error) {
        logger.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

module.exports = connectDB;