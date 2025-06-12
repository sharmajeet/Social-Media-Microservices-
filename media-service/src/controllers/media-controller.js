const logger = require("../utils/logger");
const {uploadMediaToCloudinary} = require("../utils/cloudinary");
const Media = require("../models/Media"); // ADD THIS LINE

const uploadMedia = async (req, res) => {
    console.log(req.file, "Received media upload request");
  logger.info("Received media upload request");
  try {
    console.log( req.file ,"Received media upload request");
    if (!req.file) {
      logger.warn("No file uploaded");
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(
      `File details - Name: ${originalname}, Type: ${mimetype}, Size: ${buffer.length} bytes`
    );

    // Call the utility function to upload media to Cloudinary
    logger.info("Uploading media to Cloudinary - Starting upload");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `Media uploaded to Cloudinary successfully: public Id - ${cloudinaryUploadResult.public_id} `
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id, 
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId, 
    });

    const savedMedia = await newlyCreatedMedia.save(); 

    res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      media: savedMedia, 
    });
  } catch (error) {
    logger.error("Error while uploading media:", error);
    res
      .status(500)
      .json({ success: false, message: "Error while uploading media" });
  }
};

module.exports = {
  uploadMedia,
};