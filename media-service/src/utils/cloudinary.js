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

module.exports = {
  uploadMediaToCloudinary
};