const express = require('express');
const multer = require('multer');
const path = require('path');
const resumeController = require('../controllers/resumeController');
const { authenticateRequest } = require('../middlewares/auth-middleware');
const { validateResumeUpload, validatePagination } = require('../utils/validator');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.doc'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Public routes
router.post('/parse', upload.single('resume'), validateResumeUpload, resumeController.parseResume);
router.get('/stats', resumeController.getStats);
router.get('/search/skills', resumeController.searchBySkills);

// Protected routes (require authentication)
router.get('/user/:userId', authenticateRequest, validatePagination, resumeController.getUserResumes);
router.get('/:id', authenticateRequest, resumeController.getResumeById);
router.delete('/:id', authenticateRequest, resumeController.deleteResume);

module.exports = router;