const logger = require('../utils/logger');
const {validateUserRegistration,validateUserLogin} = require('../utils/validator');
const {generateToken} = require('../utils/generateToken');
const User = require('../models/User'); 
const RefreshToken = require('../models/RefreshToken');

//user registration
const registerUser = async (req, res) => {
    try {

        //validate the request body -- through validator 
        const { error } = validateUserRegistration(req.body);
        if (error) {
            logger.warn('Validation error during user registration', { error: error.details[0].message });
            return res.status(400).json({ success : false, message: error.details[0].message });
        }

        const { username, email, password } = req.body;
        // Check if user already exists
        let user = await User.findOne({ $or: [{ username }, { email }] });
        if (user) {
            logger.warn('User already exists', { username, email });
            return res.status(409).json({ success: false, message: 'User already exists' });
        }

        // Create a new user
        user = new User  ({ username, email, password });
        await user.save();
        logger.info('User registered successfully', { username, email });

        //generate tokens
        const {accessToken, refreshToken} = await generateToken(user);

        res.status(201).json({ success : true , message: 'User registered successfully' , accessToken, refreshToken });

    } catch (error) {
        logger.error('Error during user registration', { error });
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}



//user login
const loginUser = async (req, res) => {
    try {
        const { error } = validateUserLogin(req.body);
        if (error) {
            logger.warn('Validation error during user login', { error: error.details[0].message });
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            logger.warn('User not found', { email });
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logger.warn('Invalid password', { email });
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const { accessToken, refreshToken } = await generateToken(user);
        logger.info('User logged in successfully', { email });
        return res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            accessToken,
            refreshToken,
            userId: user._id,
        });

    } catch (error) {
        logger.error('Error during user login', { error });
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


//refresh token
const generateRefreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn('Refresh token is required');
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }

        // Verify the refresh token and generate a new access token
        const storedToken = await RefreshToken.findOne({ token: refreshToken });
        if (!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn('Invalid refresh token');
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const user = await User.findById(storedToken.user);
        if (!user) {
            logger.warn('User not found for refresh token', { userId: storedToken.user });
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate new access token
        const{accessToken : newAccessToken , refreshToken : newRefreshToken} = await generateToken(user);
        logger.info('New access token generated successfully', { userId: user._id });

        //delete the old refresh token
        await RefreshToken.deleteOne({ _id: storedToken._id });

        return res.status(200).json({
            success: true,
            message: 'New access token generated successfully',
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });


    } catch (error) {
        logger.error('Error during refresh token generation', { error });
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


//logout
const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn('Refresh token is required for logout');
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }

        // Delete the refresh token from the database
       await RefreshToken.deleteOne({ token: refreshToken });
        logger.info('Refresh token deleted successfully', { refreshToken });
        logger.info('User logged out successfully', { refreshToken });
        return res.status(200).json({ success: true, message: 'User logged out successfully' });

    } catch (error) {
        logger.error('Error during user logout', { error });
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

module.exports = {registerUser,loginUser,generateRefreshToken,logoutUser}