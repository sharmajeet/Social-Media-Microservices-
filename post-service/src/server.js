const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const postRoutes = require('./routes/post-routes');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const { connect } = require('./db/connection');
const { RateLimiterRedis } = require('rate-limiter-flexible');

const app = express();
const PORT = process.env.PORT || 3002;

const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

redisClient.on('connect', () => {
    logger.info('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB Connection
connect()
  .then(() => logger.info('MongoDB connection established successfully'))
  .catch(err => {
    logger.error(`Failed to connect to MongoDB: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Received: ${req.method} request to ${req.url}`);
  logger.info(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});



// Rate limiting middleware
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: 'Too Many Requests' });
    });
});

// Routes
app.use('/api/posts', (req, res, next) => {
  req.redisClient = redisClient;
  next();
}, postRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Post Service is running on port ${PORT}`);
  console.log(`Post Service is running on port ${PORT}`);
});

// Unhandled Promise Rejection Handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
