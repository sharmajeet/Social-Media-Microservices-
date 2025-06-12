const logger = require('../utils/logger');
const Post = require('../models/Post');
const { validateNewPost } = require('../utils/validator');
const Redis = require('ioredis');
const redisClient = new Redis('redis://localhost:6379');


//invalidate the cache when a new post is created
async function invalidateCacheOnPostCreation(req,input) {
 const keys = await redisClient.keys('posts:*');
  if(keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  try {
    logger.info('Validating request body for creating post:', req.body);
    const { error } = validateNewPost(req.body);
    if (error) {
      logger.warn('Validation error while creating post:', error.details[0].message);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { content, mediaIds } = req.body;

    const post = new Post({
      user: req.user.userId, 
      content,
      mediaIds
    });

    await post.save();
    //now store the post in cache
    await invalidateCacheOnPostCreation(req, post._id.toString());

    logger.info('Post created successfully:', post);
    res.status(201).json({ success: true, message: 'Post created successfully', post });
  } catch (error) {
    logger.error('Error while creating post:', error);
    res.status(500).json({ success: false, message: 'Error while creating post' });
  }
};

const getAllPosts = async (req, res) => {
try{
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;

  const cacheKey = `posts:${page}:${limit}`;
  const cachedPosts = await redisClient.get(cacheKey);

  if (cachedPosts) {
    logger.info('Fetching posts from cache');
    return res.json(JSON.parse(cachedPosts));
  }

  //if not in cache, fetch from database
  const posts = await Post.find({}).sort({ createdAt: -1 })
  .skip(startIndex)
  .limit(limit);

  const totalNumberOfPosts = await Post.countDocuments();

  const result = {
    posts,
    currentPage: page,
    totalPages: Math.ceil(totalNumberOfPosts / limit),
    totalPosts: totalNumberOfPosts
  }

  //now store the result in cache
  await req.redisClient.setex(cacheKey, 600, JSON.stringify(result));
  logger.info('Posts fetched successfully:');

  res.status(200).json({ success: true, message: 'Posts fetched successfully', data: result });

}catch (error) {
    logger.error('Error while fetching posts:', error);
    res.status(500).json({ success: false, message: 'Error while fetching posts' });
  }

}

const getPost  =async(req,res) =>{
  try{
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await redisClient.get(cacheKey);

    if(cachedPost) {
      return res.status(200).json({ success: true, message: 'Post fetched successfully', data: JSON.parse(cachedPost) });
    }

    //if not in cache, fetch from database
    const singlePostDetailsById = await Post.findById(postId);
    if (!singlePostDetailsById) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    //now store the post in cache
    await req.redisClient.setex(cacheKey, 600, JSON.stringify(result));

    logger.info('Post fetched successfully:', singlePostDetailsById);
    res.status(200).json({ success: true, message: 'Post fetched successfully', data: singlePostDetailsById });


  }catch(error){
    logger.error('Error while fetching post:', error);
    res.status(500).json({ success: false, message: 'Error while fetching post' });
}
}

const deletePost = async (req, res) => {
  try{
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this post' });
    }
    await post.deleteOne();
    //invalidate the cache for this post
    await redisClient.del(`post:${postId}`);
    logger.info('Post deleted successfully:', postId);
    res.status(200).json({ success: true, message: 'Post deleted successfully' });

  }
  catch (error) {
    logger.error('Error while deleting post:', error);
    res.status(500).json({ success: false, message: 'Error while deleting post' });
  }
}

module.exports = {
  createPost,
  getAllPosts,
  getPost,
  deletePost
};
