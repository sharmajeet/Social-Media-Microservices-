const Joi = require('joi');

const validateNewPost = (data) => {
    const schema = Joi.object({
        content: Joi.string().min(1).required(),
        mediaIds: Joi.array().items(Joi.string()).optional(),
    });

    return schema.validate(data);
};


module.exports = {validateNewPost};