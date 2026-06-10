const jwt = require('jsonwebtoken');

// Requirement 6: Authentication & Authorization - Protect restricted routes
exports.verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(
    token.split(' ')[1],
    process.env.JWT_SECRET || 'secret_key',
    (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });
      req.user = decoded;
      next();
    }
  );
};

// Requirement 6: Authentication & Authorization - Apply role-based access control (RBAC)
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Require Admin Role' });
  }
};

exports.isDoctor = (req, res, next) => {
  if (req.user && req.user.role === 'doctor') {
    next();
  } else {
    res.status(403).json({ message: 'Require Doctor Role' });
  }
};
