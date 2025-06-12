const Joi = require('joi');

const validateUserRegistration = (data) => {
    const schema = Joi.object({
        username: Joi.string().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        // confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    });

    return schema.validate(data);
};

const validateUserLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    });

    return schema.validate(data);
};

module.exports = {validateUserRegistration,validateUserLogin};