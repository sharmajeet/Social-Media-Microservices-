const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./db/connection');
const resumeRoutes = require('./routes/resume-routes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3002;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) }}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/resume', resumeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'resume-parser-service',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
    logger.info(`Resume Parser Service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;