import { verifyToken } from '../utils/jwt.js';
import { FarmerStoreLink, Store } from '../models/index.js';

// Authentication middleware
export const authenticate = (req, res, next) => {
  try {
    const cookieToken = String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('auth_token='))
      ?.split('=')
      .slice(1)
      .join('=');
    const token = req.headers.authorization?.split(' ')[1] || cookieToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

// Authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    next();
  };
};

export const requireStoreAccess = async (req, res, next) => {
  try {
    const storeId = req.headers['x-store-id'] || req.user?.storeId;
    if (!storeId) {
      return res.status(403).json({ success: false, message: 'Store context is required' });
    }

    if (req.user.role === 'ADMIN') {
      const store = await Store.findOne({ _id: storeId, ownerAdminId: req.user.userId });
      if (!store) return res.status(403).json({ success: false, message: 'Store access denied' });
    } else if (req.user.role === 'FARMER') {
      const link = await FarmerStoreLink.findOne({ farmerId: req.user.userId, storeId });
      if (!link) return res.status(403).json({ success: false, message: 'Store access denied' });
    }

    req.storeId = storeId;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Store access denied' });
  }
};
