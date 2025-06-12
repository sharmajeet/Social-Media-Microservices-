const JWT = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken'); 
const generateToken = async (user) => {
    // Generate access token
    const accessToken = JWT.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '60m' }
    );

    // Generate refresh token
    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Save the refresh token in the DB
    await RefreshToken.create({
        token: refreshTokenValue,
        user: user._id,
        expiresAt: expiresAt
    });

    // Return tokens
    return { accessToken, refreshToken: refreshTokenValue };
};

module.exports = { generateToken };
