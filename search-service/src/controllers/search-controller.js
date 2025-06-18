const logger = require('../utils/logger');
const Search = require('../models/search');



const searchPostController = async (req, res) => {
    try {
        logger.info(`Received search request with query: ${req.query.q}`);

        const { query } = req.query;

        const result = await Search.find(
            {
                $text: {
                    $search: query
                }
            },
            {
                score: { $meta: "textScore" }
            }
        ).sort({ score: { $meta: "textScore" } }).limit(10);

        return res.status(200).json({
            success: true,
            message: 'Search results retrieved successfully',
            data: result
        });

    }
    catch (err) {
        logger.error(`Error in searchPostController: ${err.message}`, { stack: err.stack });
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

module.exports = {
    searchPostController
};

module.exports = searchPostController;
