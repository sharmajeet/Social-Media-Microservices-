const amqp = require('amqplib');
const logger = require('./logger');

let channel = null;
let connection = null;

const connectRabbitMQ = async () => {
    try {
        const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
        connection = await amqp.connect(amqpUrl);
        channel = await connection.createChannel();
        
        // Create exchange
        await channel.assertExchange('resume-events', 'topic', { durable: true });
        
        logger.info('Connected to RabbitMQ');
        
        // Handle connection events
        connection.on('error', (err) => {
            logger.error('RabbitMQ connection error:', err);
        });
        
        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
            setTimeout(connectRabbitMQ, 5000); // Reconnect after 5 seconds
        });
        
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ:', error);
        setTimeout(connectRabbitMQ, 5000); // Retry after 5 seconds
    }
};

const publishToQueue = async (routingKey, message) => {
    try {
        if (!channel) {
            await connectRabbitMQ();
        }
        
        const messageBuffer = Buffer.from(JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
        }));
        
        await channel.publish('resume-events', routingKey, messageBuffer, {
            persistent: true
        });
        
        logger.info(`Message published to ${routingKey}`);
    } catch (error) {
        logger.error('Error publishing message:', error);
        throw error;
    }
};

const consumeQueue = async (queueName, routingKey, callback) => {
    try {
        if (!channel) {
            await connectRabbitMQ();
        }
        
        await channel.assertQueue(queueName, { durable: true });
        await channel.bindQueue(queueName, 'resume-events', routingKey);
        
        channel.consume(queueName, async (msg) => {
            if (msg) {
                const content = JSON.parse(msg.content.toString());
                try {
                    await callback(content);
                    channel.ack(msg);
                } catch (error) {
                    logger.error('Error processing message:', error);
                    channel.nack(msg, false, true); // Requeue the message
                }
            }
        });
        
        logger.info(`Consuming messages from ${queueName} with routing key ${routingKey}`);
    } catch (error) {
        logger.error('Error setting up consumer:', error);
        throw error;
    }
};

// Initialize connection if RabbitMQ is enabled
if (process.env.RABBITMQ_ENABLED === 'true') {
    connectRabbitMQ();
}

module.exports = {
    publishToQueue,
    consumeQueue
};