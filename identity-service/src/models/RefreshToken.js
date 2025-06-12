const monogoose = require('mongoose');

const refreshTokenSchema = new monogoose.Schema({
    token : {
        type: String,
        required: true,
        unique: true
    },
    user : {
        type: monogoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
  },
{timestamps: true});

//index 
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = monogoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
