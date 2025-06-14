const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadMediaToCloudinary = async (file) => {
  try {
    if (!file || !file.buffer) {
      throw new Error('No file or buffer provided');
    }

    logger.info(`Starting Cloudinary upload for: ${file.originalname}`);

    // Use the simpler upload method with buffer
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'media-uploads',
          public_id: `${Date.now()}_${file.originalname.split('.')[0]}`,
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload failed:', error);
            reject(error);
          } else {
            logger.info(`Cloudinary upload successful: ${result.public_id}`);
            resolve(result);
          }
        }
      ).end(file.buffer);
    });

  } catch (error) {
    logger.error('Error in uploadMediaToCloudinary:', error);
    throw error;
  }
};

const deleteMediaFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('No public ID provided for deletion');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          logger.error('Cloudinary deletion failed:', error);
          reject(error);
        } else {
          logger.info(`Media Deletion From Cloudinary is successful: ${result.result}`);
          resolve(result);
        }
      });
    });

  } catch (error) {
    logger.error('Error in deleteMediaFromCloudinary:', error);
    throw error;
  }
}

// no need of this method as we can use the delete and upload methods separately
const updateMediaInCloudinary = async (publicId, file) => {
  try {
    if (!publicId || !file || !file.buffer) {
      throw new Error('Invalid parameters for update');
    }

    logger.info(`Starting Cloudinary update for: ${publicId}`);

    // First delete the existing media
    await deleteMediaFromCloudinary(publicId);

    // Then upload the new media
    return uploadMediaToCloudinary(file);

  } catch (error) {
    logger.error('Error in updateMediaInCloudinary:', error);
    throw error;
  }
}

const getMediaByIdfromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    // Validate publicId
    if (!publicId || typeof publicId !== 'string' || publicId.trim() === '') {
      throw new Error('Invalid or missing public ID for retrieval');
    }

    logger.info(`Retrieving media from Cloudinary: ${publicId}`);

    // Use await with cloudinary.api.resource
    const result = await cloudinary.api.resource(publicId, { resource_type: resourceType });

    logger.info(`Cloudinary resource retrieved successfully: ${result.public_id}`);
    return result;

  } catch (error) {
    logger.error(`Error in getMediaByIdfromCloudinary: ${error.message}`, error);
    throw new Error(`Failed to retrieve media: ${error.message}`);
  }
};

module.exports = {
  uploadMediaToCloudinary,
  deleteMediaFromCloudinary,
  updateMediaInCloudinary,
  getMediaByIdfromCloudinary
};