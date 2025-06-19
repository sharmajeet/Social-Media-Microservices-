const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'resume-parser-service' },
    transports: [
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../combined.log') 
        })
    ]
});

// If not in production, log to console too
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;