const express = require("express");
require("dotenv").config();
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("../src/utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middlewares/errorHandler")
const { authenticateRequest } = require("./middlewares/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

redisClient.on('connect', () => {
    logger.info('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

app.use(helmet());
app.use(cors());
// app.use(express.json()); // Keep this commented for file uploads

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 10000, // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(
      `Rate limit exceeded for sensitive endpoint: ${req.method} ${req.url}`,
      { ip: req.ip }
    );
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(rateLimiter);

app.use((req, res, next) => {
  logger.info(`Received: ${req.method} request to ${req.url}`);
  logger.info(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});

///////////////////////////////////////////////////////////////////
//""""This one is the main logic behind the API Gateway"""""//
///////////////////////////////////////////////////////////////////
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ success: false, message: "Internal Server Error" });
  },
};

//setting up proxy for each service
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from identity service: ${proxyRes.statusCode}`, {
        ip: userReq.ip,
      });

      return proxyResData;
    },
  })
);

//setting up proxy for post service
app.use(
  "/v1/posts",
  authenticateRequest,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from post service: ${proxyRes.statusCode}`, {
        ip: userReq.ip,
      });

      return proxyResData;
    },
  })
);

//setting up proxy for our media service - FIXED FOR FILE UPLOADS
app.use(
  "/v1/media",
  authenticateRequest,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      
      // FIXED: Better content-type handling (case insensitive)
      const contentType = srcReq.headers["content-type"] || "";
      if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      // For multipart, don't set Content-Type - let the browser handle it

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from media service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
    parseReqBody: false, // IMPORTANT: Keep false for file uploads
    limit: '10mb', // ADDED: Set upload limit
  })
);

//setting up proxy for search service
app.use(
  "/v1/search",
  authenticateRequest,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(`Response from Search service: ${proxyRes.statusCode}`, {
        ip: userReq.ip,
      });

      return proxyResData;
    },
  })
);


//setting up proxy for Resume-Parser service
app.use(
  "/v1/resume",
  authenticateRequest,
  proxy(process.env.RESUME_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      
      // FIXED: Better content-type handling (case insensitive)
      const contentType = srcReq.headers["content-type"] || "";
      if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      // For multipart, don't set Content-Type - let the browser handle it

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Resume service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
    parseReqBody: false, // IMPORTANT: Keep false for file uploads
    limit: '10mb', // ADDED: Set upload limit
  })
);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(`Identity Service URL: ${process.env.IDENTITY_SERVICE_URL}`);
  logger.info(`Post Service URL: ${process.env.POST_SERVICE_URL}`);
  logger.info(`Media Service URL: ${process.env.MEDIA_SERVICE_URL}`);
  logger.info(`Search Service URL: ${process.env.SEARCH_SERVICE_URL}`);
  logger.info(`Resume Service URL: ${process.env.RESUME_SERVICE_URL}`);
  logger.info(`Redis URL: ${process.env.REDIS_URL}`);
});