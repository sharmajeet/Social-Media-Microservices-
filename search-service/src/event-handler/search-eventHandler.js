const Search = require('../models/search');
const logger = require('../utils/logger');

async function handlePostCreatedEvent(event) {
    try {
        const newSearchPost = new Search({
            postId: event.postId,
            userId: event.userId,
            content: event.content,
            createdAt: event.createdAt
        });

        await newSearchPost.save();

        logger.info(`Search document created successfully for post using handlePostCreatedEvent: ${event.postId}`);
    } catch (error) {
        logger.error('Error handling post created event:', error);
    }
}

module.exports = {
    handlePostCreatedEvent
};
