// middleware/roleMiddleware.js
// Usage: roleMiddleware('admin')

module.exports = function(requiredRole) {
  return function(req, res, next) {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
};
