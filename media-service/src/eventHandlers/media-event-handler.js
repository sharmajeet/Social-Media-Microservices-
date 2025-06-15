const Media = require('../models/Media');
const { deleteMediaFromCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const handlePostDeleted = async (event) => {
    console.log(event, "event in media service");
    const { postId, mediaIds } = event;
    try {
        //now we have to call the delete media service
        const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

        for (const media of mediaToDelete) {
            //delete the media from cloudinary
            await deleteMediaFromCloudinary(media.publicId);
            //delete the media from database
            await Media.findByIdAndDelete({ _id: media._id });

            logger.info(`Media with ID ${media._id} deleted successfully, associated with post ID ${postId}`);
        }
    }
    catch (error) {
        logger.error("Error handling post deleted event:", error);
    }
}

module.exports = {
    handlePostDeleted
};