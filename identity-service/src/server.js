const {connect} = require("../src/db/connection");
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require("../src/utils/logger");
const {RateLimiterRedis} = require("rate-limiter-flexible")
const Redis = require("ioredis"); // FIX: Remove destructuring
const {rateLimit} = require("express-rate-limit")
const {RedisStore} = require('rate-limit-redis')
const identityServiceRoutes = require('../src/routes/identity-service');
const errorHandler = require('../src/middlewares/errorHandler');

const app = express();

const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

redisClient.on('connect', () => {
    logger.info('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connect()
  .then(() => logger.info('MongoDB connection established successfully'))
  .catch(err => {
      logger.error(`Failed to connect to MongoDB: ${err.message}`, { stack: err.stack });
      process.exit(1); 
  });

app.use((req,res,next)  => {
    logger.info(`Received: ${req.method} request to ${req.url}`);
    logger.info(`Request Body: ${JSON.stringify(req.body)}`);
    next();
});

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10, // 10 requests
    duration: 1, // per second
});

app.use((req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({ success: false, message: 'Too Many Requests' });
        });
});

const sensistiveEndpointLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute (FIX: comment said 15 minutes)
    max: 1005, // limit each IP to 1005 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler : (req,res) =>{
        logger.warn(`Rate limit exceeded for sensitive endpoint: ${req.method} ${req.url}`, { ip: req.ip });
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.'
        });
    },
    store : new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

app.use('/api/auth', sensistiveEndpointLimiter); // apply limiter to whole /api/auth

//routes
app.use('/api/auth', identityServiceRoutes);

//error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    logger.info(`Identity Service is running on port ${PORT}`);
    console.log(`Identity Service is running on port ${PORT}`);
});

//unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});