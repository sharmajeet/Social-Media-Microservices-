const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const mediaRoutes = require('./routes/media-routes');
const errorHandler = require('./middlewares/errorHandler');
const { connect } = require('./db/connection');

const app = express();
const PORT = process.env.PORT;

//middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(errorHandler);


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

//rotes
app.use('/api/media', mediaRoutes);


app.listen(process.env.PORT, () => {
    logger.info(`Media Service is running on port ${process.env.PORT || 3003}`);
    console.log(`Media Service is running on port ${process.env.PORT || 3003}`);
});

//unhandled promise rejections
process.on('unhandledRejection', (reason,promis) => {
    logger.error('Unhandled Rejection at :',promis, 'reason:', reason);
});