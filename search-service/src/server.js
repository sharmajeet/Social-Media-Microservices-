const express = require('express');
const jwt = require('jsonwebtoken');
const { connect } = require('./db/connection');
const errorHandler = require('./middlewares/errorHandler');
const Redis = require('ioredis');
const logger = require('./utils/logger');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');


const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
 

