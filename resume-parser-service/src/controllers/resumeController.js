const fs = require('fs').promises;
const path = require('path');
const Resume = require('../models/Resume');
const extractPdf = require('../utils/extractPdf');
const extractDocx = require('../utils/extractDocx');
const parseEntities = require('../utils/parseEntities');
const logger = require('../utils/logger');
const { publishToQueue } = require('../utils/rabbitmq');

const resumeController = {
    // Parse resume and save to database
    parseResume: async (req, res, next) => {
        const startTime = Date.now();
        let filePath = null;
        let resume = null;

        try {
            if (!req.file) {
                return res.status(400).json({ 
                    success: false,
                    error: 'No file uploaded' 
                });
            }

            filePath = req.file.path;
            const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
            
            // Create resume document
            resume = new Resume({
                userId: req.user?.userId || req.body.userId || req.headers['x-user-id'],
                fileName: req.file.originalname,
                fileType: fileExt,
                metadata: {
                    fileSize: req.file.size,
                    extractionMethod: fileExt === 'pdf' ? 'pdf-parse' : 'mammoth'
                }
            });

            let extractedText = '';

            // Extract text based on file type
            if (fileExt === 'pdf') {
                extractedText = await extractPdf(filePath);
            } else if (fileExt === 'docx' || fileExt === 'doc') {
                extractedText = await extractDocx(filePath);
            }

            // Store raw text
            resume.rawText = extractedText;

            // Parse entities from extracted text
            const parsedData = await parseEntities(extractedText);
            resume.parsedData = parsedData;
            resume.parseStatus = 'completed';
            resume.metadata.parseTime = Date.now() - startTime;

            // Save to database
            await resume.save();

            // Publish to RabbitMQ for other services (optional)
            if (process.env.RABBITMQ_ENABLED === 'true') {
                await publishToQueue('resume.parsed', {
                    resumeId: resume._id,
                    userId: resume.userId,
                    parsedData: parsedData
                });
            }

            // Clean up uploaded file
            await fs.unlink(filePath);

            logger.info(`Resume parsed successfully: ${resume._id}`);

            res.status(201).json({
                success: true,
                message: 'Resume parsed successfully',
                data: {
                    resumeId: resume._id,
                    fileName: resume.fileName,
                    parsedData: resume.parsedData,
                    parseTime: resume.metadata.parseTime
                }
            });

        } catch (error) {
            logger.error('Error parsing resume:', error);
            
            // Clean up file if it exists
            if (filePath) {
                try {
                    await fs.unlink(filePath);
                } catch (unlinkError) {
                    logger.error('Error deleting file:', unlinkError);
                }
            }

            // Save failed status if resume was created
            if (resume && resume._id) {
                resume.parseStatus = 'failed';
                resume.parseError = error.message;
                await resume.save();
            }

            next(error);
        }
    },

    // Get resume by ID
    getResumeById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const resume = await Resume.findById(id).select('+rawText');

            if (!resume) {
                return res.status(404).json({
                    success: false,
                    error: 'Resume not found'
                });
            }

            res.json({
                success: true,
                data: resume
            });

        } catch (error) {
            logger.error('Error fetching resume:', error);
            next(error);
        }
    },

    // Get all resumes for a user
    getUserResumes: async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10, status } = req.query;

            // Verify that the authenticated user is accessing their own resumes
            if (req.user.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: You can only view your own resumes'
                });
            }

            const query = { userId };
            if (status) {
                query.parseStatus = status;
            }

            const resumes = await Resume.find(query)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .select('-rawText');

            const count = await Resume.countDocuments(query);

            res.json({
                success: true,
                data: resumes,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: limit
                }
            });

        } catch (error) {
            logger.error('Error fetching user resumes:', error);
            next(error);
        }
    },

    // Search resumes by skills
    searchBySkills: async (req, res, next) => {
        try {
            const { skills } = req.query;
            
            if (!skills) {
                return res.status(400).json({
                    success: false,
                    error: 'Skills parameter is required'
                });
            }

            const skillsArray = skills.split(',').map(s => s.trim());
            
            const resumes = await Resume.find({
                'parsedData.skills': { $in: skillsArray },
                parseStatus: 'completed'
            }).select('-rawText');

            res.json({
                success: true,
                data: resumes,
                count: resumes.length
            });

        } catch (error) {
            logger.error('Error searching resumes:', error);
            next(error);
        }
    },

    // Delete resume
    deleteResume: async (req, res, next) => {
        try {
            const { id } = req.params;
            
            // First find the resume to check ownership
            const resume = await Resume.findById(id);
            
            if (!resume) {
                return res.status(404).json({
                    success: false,
                    error: 'Resume not found'
                });
            }

            // Verify that the authenticated user owns this resume
            if (resume.userId !== req.user.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: You can only delete your own resumes'
                });
            }

            // Delete the resume
            await Resume.findByIdAndDelete(id);

            // Publish deletion event
            if (process.env.RABBITMQ_ENABLED === 'true') {
                await publishToQueue('resume.deleted', {
                    resumeId: id,
                    userId: resume.userId
                });
            }

            res.json({
                success: true,
                message: 'Resume deleted successfully'
            });

        } catch (error) {
            logger.error('Error deleting resume:', error);
            next(error);
        }
    },

    // Get parsing statistics
    getStats: async (req, res, next) => {
        try {
            const stats = await Resume.aggregate([
                {
                    $group: {
                        _id: '$parseStatus',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const totalResumes = await Resume.countDocuments();
            const avgParseTime = await Resume.aggregate([
                { $match: { parseStatus: 'completed' } },
                { $group: { _id: null, avgTime: { $avg: '$metadata.parseTime' } } }
            ]);

            res.json({
                success: true,
                data: {
                    total: totalResumes,
                    statusBreakdown: stats,
                    averageParseTime: avgParseTime[0]?.avgTime || 0
                }
            });

        } catch (error) {
            logger.error('Error fetching stats:', error);
            next(error);
        }
    }
};

module.exports = resumeController;