const logger = require("./logger");
const amqp = require("amqplib");

let channel = null;
let connection = null;

const EXCHANGE_NAME = "post_event";

const connectRabbitMQ = async () => {
    try {
        // const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

        connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, "topic", {
            durable: false,
        });

        logger.info("Connected to RabbitMQ successfully");

        return channel;
    } catch (error) {
        logger.error("Failed to connect to RabbitMQ", error);
        throw error;
    }
}

async function consumeEvent(routingKey, callback) {
    try {
        if (!channel) {
            await connectRabbitMQ();
        }

        const q = await channel.assertQueue('', { exclusive: true });
        await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
        channel.consume(q.queue, (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());
                callback(messageContent);
                channel.ack(msg);
            }
        });

        logger.info(`Listening for events with routing key: ${routingKey}`);
    } catch (error) {
        logger.error("Failed to consume event", error);
        throw error;
    }
}
module.exports = { connectRabbitMQ ,consumeEvent };
