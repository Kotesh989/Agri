import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token
export const generateToken = (userId, email, role, adminId, storeId) => {
  return jwt.sign(
    { userId, email, role, adminId, storeId },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Decode token without verification
export const decodeToken = (token) => {
  return jwt.decode(token);
};
