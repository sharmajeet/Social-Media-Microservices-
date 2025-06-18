const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middlewares/errorHandler');
const Redis = require('ioredis');
const logger = require('./utils/logger');
require('dotenv').config();
const { connectRabbitMQ } = require('./utils/rabbitmq');
const {connect} = require('./db/connection');
const searchRoutes = require('./routes/search-routes');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { consumeEvent } = require('./utils/rabbitmq');
const { handlePostCreatedEvent } = require('./event-handler/search-eventHandler');


const app = express();
const PORT = process.env.PORT || 3004;

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


app.use('/api/search', searchRoutes);


app.use(errorHandler);

async function startServer() {
    try {
        await connectRabbitMQ();
        logger.info('RabbitMQ connection established successfully');

        //subscribe to post creation events
        await consumeEvent('post.created', handlePostCreatedEvent);

        app.listen(PORT, () => {
            logger.info(`Search service is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`, { stack: error.stack });
        process.exit(1);
    }
}

startServer();

