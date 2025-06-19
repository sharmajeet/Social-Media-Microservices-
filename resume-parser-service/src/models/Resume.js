const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: false
    },
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true,
        enum: ['pdf', 'docx', 'doc']
    },
    parsedData: {
        name: String,
        email: String,
        phone: String,
        age: Number,
        location: String,
        summary: String,
        skills: [String],
        experience: [{
            title: String,
            company: String,
            duration: String,
            description: String
        }],
        education: [{
            degree: String,
            institution: String,
            year: String,
            details: String
        }],
        languages: [String],
        certifications: [String],
        links: {
            linkedin: String,
            github: String,
            portfolio: String
        }
    },
    rawText: {
        type: String,
        select: false // Don't include in queries by default
    },
    parseStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    parseError: String,
    metadata: {
        fileSize: Number,
        parseTime: Number, // in milliseconds
        extractionMethod: String
    }
}, {
    timestamps: true
});

// Indexes for better query performance
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ 'parsedData.email': 1 });
resumeSchema.index({ parseStatus: 1 });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;