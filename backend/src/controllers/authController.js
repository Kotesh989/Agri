import crypto from 'node:crypto';
import { Customer, FarmerAuthOtp, FarmerStoreLink, PasswordResetOtp, Settings, Store, User } from '../models/index.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { sendEmailOtp } from '../utils/otpDelivery.js';

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  mobileNumber: user.mobileNumber,
  name: user.name,
  role: user.role,
  adminId: user.role === 'ADMIN' ? user.id : user.adminId?.toString(),
  isActive: user.isActive,
  isPhoneVerified: user.isPhoneVerified,
  customerId: user.customerId?.toString(),
});

const adminTokenId = (user) => (user.role === 'ADMIN' ? user.id : user.adminId?.toString());
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};
const setAuthCookie = (res, token) => res.cookie('auth_token', token, cookieOptions);

const createDefaultStoreForAdmin = async (admin) => {
  const store = await Store.create({
    ownerAdminId: admin._id,
    name: `${admin.name}'s Store`,
    ownerName: admin.name,
    subscriptionStatus: 'ACTIVE',
  });
  await Settings.findOneAndUpdate(
    { adminId: admin._id },
    { adminId: admin._id, storeId: store._id, shopName: store.name },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  return store;
};

const createUser = async ({ username, email, mobileNumber, password, name, role, customerId, adminId, isPhoneVerified, ...extra }) => {
  const normalizedUsername = username ? String(username).trim().toLowerCase() : undefined;
  const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;
  const normalizedMobileNumber = mobileNumber ? String(mobileNumber).trim() : undefined;
  const existingUser = await User.findOne({
    $or: [
      ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ...(normalizedMobileNumber ? [{ mobileNumber: normalizedMobileNumber }] : []),
    ],
  });
  if (existingUser) throw new Error('User already exists');

  return User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    mobileNumber: normalizedMobileNumber,
    password: password ? await hashPassword(password) : undefined,
    name,
    role,
    customerId,
    adminId,
    isPhoneVerified: Boolean(isPhoneVerified),
    ...extra
  });
};

export const register = async (req, res) => {
  try {
    const { email, password, name, customerId, mobileNumber, adminId, adminEmail } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
    }

    const admin = await User.findOne({
      role: 'ADMIN',
      isActive: true,
      ...(adminId ? { _id: adminId } : { email: String(adminEmail || '').trim().toLowerCase() }),
    });
    if (!admin) {
      return res.status(400).json({ success: false, message: 'A valid store admin email is required for farmer registration' });
    }

    const user = await createUser({ email, mobileNumber, password, name, role: 'FARMER', customerId, adminId: admin._id });

    const token = generateToken(user.id, user.email, user.role, adminTokenId(user));
    setAuthCookie(res, token);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: publicUser(user), token },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
    }
    const user = await createUser({ email, password, name, role: 'ADMIN' });
    user.adminId = user._id;
    await user.save();
    const store = await createDefaultStoreForAdmin(user);
    res.status(201).json({ success: true, message: 'Admin account created successfully', data: { user: publicUser(user), store } });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Register admin error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const registerFarmer = async (req, res) => {
  try {
    const { name, username, email, mobileNumber, password, confirmPassword, address, village, taluk, district, state, pinCode, preferredLanguage, profilePhoto, adminId, adminEmail } = req.body;

    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Full Name is required' });
    if (!username || !String(username).trim()) return res.status(400).json({ success: false, message: 'Username is required' });
    if (!mobileNumber || !String(mobileNumber).trim()) return res.status(400).json({ success: false, message: 'Mobile Number is required' });
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (!state || !String(state).trim()) return res.status(400).json({ success: false, message: 'State is required' });
    if (!district || !String(district).trim()) return res.status(400).json({ success: false, message: 'District is required' });
    if (!taluk || !String(taluk).trim()) return res.status(400).json({ success: false, message: 'Taluk is required' });
    if (!village || !String(village).trim()) return res.status(400).json({ success: false, message: 'Village is required' });
    if (!pinCode || !String(pinCode).trim()) return res.status(400).json({ success: false, message: 'Pincode is required' });

    // Validate username rules:
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (username.length < 4 || username.length > 30 || !usernameRegex.test(username)) {
      return res.status(400).json({ success: false, message: 'Username must be 4-30 characters and only contain letters, numbers, underscores, or dots.' });
    }

    const normalizedMobileNumber = String(mobileNumber).trim();
    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;

    // Check unique username
    const existingUserByUsername = await User.findOne({ username: normalizedUsername });
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    // Check unique mobileNumber
    const existingUserByMobile = await User.findOne({ mobileNumber: normalizedMobileNumber });
    if (existingUserByMobile) {
      return res.status(400).json({ success: false, message: 'Mobile Number is already registered' });
    }

    const admin = await User.findOne({
      role: 'ADMIN',
      isActive: true,
      ...(adminId ? { _id: adminId } : { email: String(adminEmail || '').trim().toLowerCase() }),
    });
    if (!admin) {
      return res.status(400).json({ success: false, message: 'A valid store admin email is required for farmer registration' });
    }
    const user = await createUser({
      username: normalizedUsername,
      email: normalizedEmail,
      mobileNumber: normalizedMobileNumber,
      password,
      name,
      role: 'FARMER',
      customerId: null, // will be created when admin activates
      adminId: admin._id,
      address,
      village,
      taluk,
      district,
      state,
      pinCode,
      preferredLanguage,
      profilePhoto,
      isActive: false, // set false for admin approval flow
    });
    res.status(201).json({ success: true, message: 'Farmer account created successfully', data: { user: publicUser(user) } });
  } catch (error) {
    if (error.code === 11000 || error.message === 'User already exists') {
      return res.status(400).json({ success: false, message: 'Farmer account already exists' });
    }
    console.error('Register farmer error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const loginWithRole = async (req, res, expectedRole) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = String(identifier || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Email or phone number and password are required' });
    }

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { mobileNumber: loginId },
        { username: loginId.toLowerCase() },
      ],
    });
    if (!user) {
      return res.status(404).json({ success: false, code: 'USER_NOT_REGISTERED', message: 'User is not registered' });
    }
    if (expectedRole && user.role !== expectedRole) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.password) {
      return res.json({
        success: true,
        passwordSetupRequired: true,
        userId: user._id,
        username: user.username,
        message: 'Account found. Please create your password to activate your login.'
      });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account registration is pending admin verification. Please contact the shop owner.' });
    }

    const isPasswordValid = user.password ? await comparePassword(password, user.password) : false;
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Require Email OTP verification if logging in with email (ADMIN role only)
    if (loginId.includes('@') && user.role === 'ADMIN') {
      const otp = generateOtp();
      await FarmerAuthOtp.deleteMany({ identifier: user.email.toLowerCase(), consumedAt: null });
      await FarmerAuthOtp.create({
        identifier: user.email.toLowerCase(),
        channel: 'EMAIL',
        otpHash: await hashPassword(otp),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendAvailableAt: new Date(Date.now() + 60 * 1000),
      });

      console.info(`Email OTP for ${user.email}: ${otp}`);
      try {
        await sendEmailOtp({ to: user.email, otp, purpose: 'login' });
      } catch (err) {
        console.warn('Failed to send email OTP:', err.message, '| Code:', err.code, '| Response:', err.response);
      }

      return res.json({
        success: true,
        otpRequired: true,
        identifier: user.email.toLowerCase(),
        message: 'OTP verification code sent to your email.',
        data: {
          otpRequired: true,
          identifier: user.email.toLowerCase()
        }
      });
    }

    const token = generateToken(user.id, user.email, user.role, adminTokenId(user));
    setAuthCookie(res, token);
    res.json({
      success: true,
      message: 'Login successful',
      data: { user: publicUser(user), token },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const login = async (req, res) => loginWithRole(req, res);
export const adminLogin = async (req, res) => loginWithRole(req, res, 'ADMIN');
export const farmerLogin = async (req, res) => loginWithRole(req, res, 'FARMER');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const normalizeIdentifier = (value) => String(value || '').trim();

export const requestFarmerOtp = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const isEmail = identifier.includes('@');
    const channel = isEmail ? 'EMAIL' : 'PHONE';
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Mobile number is required for farmer OTP login' });
    }

    const existingUser = await getUserByIdentifier(identifier);
    if (!existingUser && !req.body.profile) {
      return res.status(404).json({ success: false, code: 'USER_NOT_REGISTERED', message: 'Farmer account not found for this mobile number' });
    }
    if (existingUser && existingUser.role !== 'FARMER') {
      return res.status(403).json({ success: false, message: 'OTP login is available for farmers only' });
    }

    const recentOtp = await FarmerAuthOtp.findOne({ identifier, consumedAt: null }).sort({ createdAt: -1 });
    if (recentOtp && recentOtp.resendAvailableAt > new Date()) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP',
        data: { resendAvailableAt: recentOtp.resendAvailableAt },
      });
    }

    const otp = generateOtp();
    await FarmerAuthOtp.deleteMany({ identifier, consumedAt: null });
    await FarmerAuthOtp.create({
      identifier,
      channel,
      otpHash: await hashPassword(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      resendAvailableAt: new Date(Date.now() + 60 * 1000),
      profile: req.body.profile || undefined,
    });

    if (channel === 'EMAIL') {
      await sendEmailOtp({ to: identifier, otp, purpose: 'login' });
    } else {
      console.info(`Farmer phone OTP for ${identifier}: ${otp}`);
    }

    res.json({
      success: true,
      message: 'OTP sent',
      data: {
        resendAfterSeconds: 60,
        channel,
        ...(process.env.NODE_ENV === 'production' ? {} : { devOtp: otp }),
      },
    });
  } catch (error) {
    console.error('Request farmer OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

const createFarmerFromOtpProfile = async (identifier, _channel, profile) => {
  const isEmail = identifier.includes('@');
  const email = isEmail ? identifier : profile?.email;
  const mobileNumber = isEmail ? profile?.mobileNumber : identifier;
  const name = profile?.fullName || profile?.name || `Farmer ${mobileNumber || email}`;

  const user = await User.create({
    email,
    mobileNumber,
    password: await hashPassword(crypto.randomBytes(24).toString('hex')),
    name,
    role: 'FARMER',
    village: profile?.village,
    taluk: profile?.taluk,
    district: profile?.district,
    state: profile?.state,
    preferredLanguage: profile?.preferredLanguage === 'kn' ? 'kn' : 'en',
    profilePhoto: profile?.profilePhoto,
    isPhoneVerified: true,
  });
  return user;
};

export const verifyFarmerOtp = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const otp = normalizeIdentifier(req.body.otp);
    if (!identifier || !otp) {
      return res.status(400).json({ success: false, message: 'Identifier and OTP are required' });
    }

    const record = await FarmerAuthOtp.findOne({
      identifier,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record || record.attempts >= 5 || !(await comparePassword(otp, record.otpHash))) {
      if (record) {
        record.attempts += 1;
        await record.save();
      }
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    let user = await getUserByIdentifier(identifier);
    if (!user) user = await createFarmerFromOtpProfile(identifier, record.channel, record.profile);
    if (record.channel === 'PHONE' && user.role !== 'FARMER') {
      return res.status(403).json({ success: false, message: 'OTP login is available for farmers only' });
    }

    if (record.channel === 'PHONE') {
      user.isPhoneVerified = true;
    }
    await user.save();
    const token = generateToken(user.id, user.email, user.role, adminTokenId(user));
    record.consumedAt = new Date();
    await record.save();
    setAuthCookie(res, token);
    res.json({ success: true, message: 'OTP verified', data: { user: publicUser(user), token } });
  } catch (error) {
    console.error('Verify farmer OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const logout = async (_req, res) => {
  res.clearCookie('auth_token', cookieOptions);
  res.json({ success: true, message: 'Logged out' });
};

const getUserByIdentifier = async (identifier) => {
  const value = String(identifier || '').trim();
  return User.findOne({
    $or: [
      { email: value.toLowerCase() },
      { mobileNumber: value },
    ],
  });
};

const getCustomerByIdentifier = async (identifier) => {
  const value = String(identifier || '').trim();
  return Customer.findOne({
    $or: [
      { email: value.toLowerCase() },
      { mobileNumber: value },
    ],
  });
};

const createFarmerUserFromCustomer = async (customer) => {
  if (!customer?.email || !customer?.mobileNumber) return null;

  try {
    return await User.create({
      email: customer.email,
      mobileNumber: customer.mobileNumber,
      password: await hashPassword(crypto.randomBytes(24).toString('hex')),
      name: customer.name,
      role: 'FARMER',
      customerId: customer._id,
      adminId: customer.adminId,
    });
  } catch (error) {
    if (error.code === 11000) {
      return User.findOne({
        $or: [
          { email: customer.email.toLowerCase() },
          { mobileNumber: customer.mobileNumber },
        ],
      });
    }
    throw error;
  }
};

const getPasswordResetUser = async (identifier) => {
  const user = await getUserByIdentifier(identifier);
  if (user) return user;

  const customer = await getCustomerByIdentifier(identifier);
  if (!customer) return null;

  return createFarmerUserFromCustomer(customer);
};

export const requestPasswordResetOtp = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const channel = 'EMAIL';
    if (!identifier || !identifier.includes('@')) {
      return res.status(400).json({ success: false, message: 'Account email is required' });
    }

    const user = await getPasswordResetUser(identifier);
    if (!user) {
      return res.json({ success: true, message: 'If the account exists, an OTP has been sent' });
    }
    const target = user.email;
    if (!target) {
      return res.status(400).json({ success: false, message: 'Email is not available for this account' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await PasswordResetOtp.deleteMany({ userId: user._id, consumedAt: null });
    await PasswordResetOtp.create({
      userId: user._id,
      channel,
      target,
      otpHash: await hashPassword(otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendEmailOtp({ to: target, otp });

    res.json({ success: true, message: 'If the account exists, an OTP has been sent' });
  } catch (error) {
    console.error('Request password reset OTP error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const otp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.newPassword || '');
    if (!identifier || !otp || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Identifier, OTP, and password of at least 8 characters are required' });
    }

    const user = await getUserByIdentifier(identifier);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const resetRecord = await PasswordResetOtp.findOne({
      userId: user._id,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!resetRecord || resetRecord.attempts >= 5 || !(await comparePassword(otp, resetRecord.otpHash))) {
      if (resetRecord) {
        resetRecord.attempts += 1;
        await resetRecord.save();
      }
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    resetRecord.consumedAt = new Date();
    await resetRecord.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password with OTP error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: publicUser(user) });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { _id: req.user.userId },
        { adminId: req.user.userId },
      ],
    }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({
      _id: userId,
      $or: [
        { _id: req.user.userId },
        { adminId: req.user.userId },
      ],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;

    // If a FARMER is being activated and doesn't have a Customer profile yet, create/link it now
    if (user.role === 'FARMER' && user.isActive) {
      if (!user.customerId) {
        // 1. Get the admin's default store
        const store = await Store.findOne({ ownerAdminId: user.adminId });
        const storeId = store ? store._id : null;

        // 2. Check if a Customer with the same mobile or email already exists for this admin
        let customer = await Customer.findOne({
          adminId: user.adminId,
          storeId,
          $or: [
            { mobileNumber: user.mobileNumber },
            { email: user.email.toLowerCase() }
          ]
        });

        // 3. If not, create a new Customer profile
        if (!customer) {
          customer = await Customer.create({
            adminId: user.adminId,
            storeId,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            address: user.address || '',
            village: user.village || '',
            taluk: user.taluk || '',
            district: user.district || '',
            state: user.state || '',
            creditLimit: 0,
          });
        }

        user.customerId = customer._id;

        // 4. Link them to the admin's default store
        if (store) {
          await FarmerStoreLink.findOneAndUpdate(
            { farmerId: user._id, storeId: store._id },
            { customerId: customer._id, lastVisitDate: new Date() },
            { upsert: true }
          );
        }
      }
    }

    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      data: publicUser(user),
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json({ available: false, message: 'Username is required' });

    const regex = /^[a-zA-Z0-9_.]+$/;
    if (username.length < 4 || username.length > 30 || !regex.test(username)) {
      return res.json({ available: false, message: 'Username must be 4-30 characters and only contain letters, numbers, underscores, or dots.' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    return res.json({ available: !existingUser });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const setupPassword = async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'User ID and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.password) {
      return res.status(400).json({ success: false, message: 'Password has already been set up' });
    }

    user.password = await hashPassword(password);
    user.isActive = true; // Activate user on setup
    await user.save();

    res.json({ success: true, message: 'Password set up successfully. You can now log in.' });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
