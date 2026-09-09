const User = require("../models/User");

/**
 * Resolves target collegeId from request context (headers, query, body, or user profile)
 */
const getContextCollegeId = (req) => {
  if (req.user && req.user.collegeId) {
    return req.user.collegeId;
  }
  if (req.headers["x-college-id"]) {
    return req.headers["x-college-id"];
  }
  if (req.query && req.query.collegeId) {
    return req.query.collegeId;
  }
  if (req.body && req.body.collegeId) {
    return req.body.collegeId;
  }
  return null;
};

/**
 * Soft auth check to attach user context if user ID is passed in headers
 */
const attachUserContext = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"] || (req.body && req.body.userId);
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  getContextCollegeId,
  attachUserContext,
};
