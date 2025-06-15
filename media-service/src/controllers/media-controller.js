const logger = require("../utils/logger");
const { uploadMediaToCloudinary, deleteMediaFromCloudinary, getMediaByIdfromCloudinary } = require("../utils/cloudinary");
const Media = require("../models/Media"); // ADD THIS LINE

const uploadMedia = async (req, res) => {
  logger.info("Received media upload request");
  try {
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

const getAllUploadedMedia = async (req, res) => {
  try {
    //first we need to get the userId from the request
    const userId = req.user.userId;

    //then we need to find all the media uploaded by the user
    const media = await Media.find({ userId });
    if (!media || media.length === 0) {
      logger.warn("No media found for the user");
      return res.status(404).json({
        success: false,
        message: "No media found for the user",
      });
    }

    logger.info(`Found ${media.length} media items for user ${userId}`);
    res.status(200).json({
      success: true,
      message: "Media fetched successfully",
      media,
    });

  }
  catch (error) {
    logger.error("Error while fetching media:", error);
    res
      .status(500)
      .json({ success: false, message: "Error while fetching media" });
  }
}

const deleteMedia = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mediaId } = req.params;

    const media = await Media.findOne({ _id: mediaId, userId });
    if (!media) {
      logger.warn("Media not found or does not belong to the user");
      return res.status(404).json({
        success: false,
        message: "Media not found or does not belong to the user",
      });
    }

    const cloudinaryResponse = await deleteMediaFromCloudinary(media.publicId);
    if (!cloudinaryResponse || cloudinaryResponse.result !== "ok") {
      logger.error("Error deleting media from Cloudinary");
      return res.status(500).json({
        success: false,
        message: "Error deleting media from Cloudinary",
      });
    }

    await Media.deleteOne({ _id: mediaId, userId });

    logger.info(`Media with ID ${mediaId} deleted successfully for user ${userId}`);
    return res.status(200).json({
      success: true,
      message: "Media deleted successfully",
    });

  } catch (error) {
    logger.error("Error while deleting media:", error);
    return res.status(500).json({
      success: false,
      message: "Error while deleting media",
    });
  }
};

const updateMedia = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mediaId } = req.params;

    const media = await Media.findOne({ _id: mediaId, userId });
    if (!media) {
      logger.warn("Media not found or does not belong to the user");
      return res.status(404).json({
        success: false,
        message: "Media not found or does not belong to the user",
      });
    }
    if (!req.file) {
      logger.warn("No file uploaded for update");
      return res.status(400).json({
        success: false,
        message: "No file uploaded for update",
      });
    }
    const { originalname, mimetype, buffer } = req.file;
    logger.info(`Updating media with ID ${mediaId} for user ${userId}`);

    // First delete the existing media from Cloudinary
    await deleteMediaFromCloudinary(media.publicId);
    logger.info(`Deleted existing media from Cloudinary: ${media.publicId}`);
    // Then upload the new media to Cloudinary
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(`Uploaded new media to Cloudinary: ${cloudinaryUploadResult.public_id}`);
    // Update the media document in the database
    media.publicId = cloudinaryUploadResult.public_id;

    media.originalName = originalname;
    media.mimeType = mimetype;
    media.url = cloudinaryUploadResult.secure_url;

    const updatedMedia = await media.save();
    logger.info(`Media with ID ${mediaId} updated successfully for user ${userId}`);
    return res.status(200).json({
      success: true,
      message: "Media updated successfully",
      media: updatedMedia,
    });
  }
  catch (error) {
    logger.error("Error while updating media:", error);
    return res.status(500).json({
      success: false,
      message: "Error while updating media",
    });
  }
}

const getMediaById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { mediaId } = req.params;

    const media = await Media.findOne({ _id: mediaId, userId });
    if (!media) {
      logger.warn("Media not found or does not belong to the user");
      return res.status(404).json({
        success: false,
        message: "Media not found or does not belong to the user",
      });
    }

    // Fetch media details from Cloudinary
    const cloudinaryMedia = await getMediaByIdfromCloudinary(media.publicId);
    if (!cloudinaryMedia) {
      logger.error("Error fetching media from Cloudinary");
      return res.status(500).json({
        success: false,
        message: "Error fetching media from Cloudinary",
      });
    }

    logger.info(`Fetched media with ID ${mediaId} successfully for user ${userId}`);
    return res.status(200).json({
      success: true,
      message: "Media fetched successfully",
      media: {
        ...media.toObject(),
        cloudinaryDetails: cloudinaryMedia,
      },
    });
  }
  catch (error) {
    logger.error("Error while fetching media by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching media by ID",
    });
  }
}
module.exports = {
  uploadMedia,
  getAllUploadedMedia,
  updateMedia,
  deleteMedia,
  getMediaById
};