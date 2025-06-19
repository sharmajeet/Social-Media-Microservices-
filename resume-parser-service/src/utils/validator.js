const Joi = require('joi');

const validateResumeUpload = (req, res, next) => {
    const schema = Joi.object({
        userId: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }
    next();
};

const validatePagination = (req, res, next) => {
    const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        status: Joi.string().valid('pending', 'completed', 'failed').optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }
    
    req.query = value;
    next();
};

module.exports = {
    validateResumeUpload,
    validatePagination
};