import mongoose from 'mongoose';

const { Schema } = mongoose;

const baseOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
    },
  },
  toObject: { virtuals: true, versionKey: false },
};

const userSchema = new Schema({
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  mobileNumber: { type: String, unique: true, sparse: true, trim: true },
  password: String,
  name: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'FARMER'], default: 'FARMER' },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  isPhoneVerified: { type: Boolean, default: false },
  village: String,
  taluk: String,
  district: String,
  state: String,
  preferredLanguage: { type: String, enum: ['en', 'kn'], default: 'en' },
  profilePhoto: String,
  isActive: { type: Boolean, default: true },
}, baseOptions);

const passwordResetOtpSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  channel: { type: String, enum: ['EMAIL', 'PHONE'], required: true },
  target: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  attempts: { type: Number, default: 0 },
  consumedAt: Date,
}, baseOptions);

const farmerAuthOtpSchema = new Schema({
  identifier: { type: String, required: true, index: true },
  channel: { type: String, enum: ['EMAIL', 'PHONE'], required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  attempts: { type: Number, default: 0 },
  resendAvailableAt: { type: Date, required: true },
  consumedAt: Date,
  profile: {
    fullName: String,
    mobileNumber: String,
    email: String,
    village: String,
    taluk: String,
    district: String,
    state: String,
    preferredLanguage: String,
    profilePhoto: String,
  },
}, baseOptions);

const storeSchema = new Schema({
  ownerAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  ownerName: { type: String, required: true },
  mobileNumber: String,
  address: String,
  village: String,
  taluk: String,
  district: String,
  state: String,
  gstNumber: String,
  logo: String,
  subscriptionStatus: { type: String, default: 'ACTIVE' },
}, baseOptions);

const farmerStoreLinkSchema = new Schema({
  farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  lastVisitDate: Date,
}, baseOptions);

farmerStoreLinkSchema.index({ farmerId: 1, storeId: 1 }, { unique: true });

const customerSchema = new Schema({
  farmerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true, trim: true },
  username: { type: String, trim: true, lowercase: true },
  email: String,
  gstNumber: String,
  address: String,
  city: String,
  village: String,
  taluk: String,
  district: String,
  state: String,
  aadhaarNumber: String,
  pinCode: String,
  creditLimit: { type: Number, default: 0 },
  totalCredit: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  lastPurchaseDate: Date,
}, baseOptions);
customerSchema.index({ adminId: 1, storeId: 1, mobileNumber: 1 }, { unique: true });
customerSchema.index({ name: 'text', email: 'text', mobileNumber: 'text', village: 'text' });

const customerPurchasedItemSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  productName: { type: String, required: true, trim: true },
  category: { type: String, enum: ['FERTILIZER', 'PESTICIDE'], required: true },
  quantity: { type: Number, required: true },
  unitType: { type: String, required: true, trim: true },
  pricePerUnit: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  pesticideWeight: Number,
  pesticideWeightUnit: { type: String, enum: ['Gram', 'Kg', 'ML', 'Litre'] },
  purchaseDate: { type: Date, required: true },
  notes: String,
}, baseOptions);

customerPurchasedItemSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true,
});

customerPurchasedItemSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: '_id',
  justOne: true,
});

const productSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  name: { type: String, required: true },
  brandName: { type: String, required: true, trim: true },
  category: { type: String, enum: ['FERTILIZER', 'PESTICIDE', 'SEEDS', 'OTHER'], required: true, default: 'FERTILIZER' },
  stockQuantity: { type: Number, default: 0 },
  unitType: { type: String, required: true, trim: true },
  pricePerUnit: { type: Number, required: true, default: 0 },
  pesticideWeight: Number,
  pesticideWeightUnit: { type: String, enum: ['Gram', 'Kg', 'ML', 'Litre'] },
  lowStockAlert: { type: Number, default: 0 },
  description: String,
  packSize: String,
  imageUrl: String,
  recommendedCrops: [String],
  applicationInstructions: String,
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },

  // Retained for the existing invoice and purchase flows.
  brand: String,
  npkRatio: String,
  batchNumber: String,
  expiryDate: Date,
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  gstPercentage: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  unit: String,
  currentStock: { type: Number, default: 0 },
  minimumStock: { type: Number, default: 0 },
}, baseOptions);

productSchema.index({ adminId: 1, storeId: 1, category: 1, stockQuantity: 1 });
productSchema.index({ name: 'text', brandName: 'text', npkRatio: 'text', description: 'text' });

const supplierSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  name: { type: String, required: true },
  contactPerson: String,
  mobileNumber: { type: String, required: true },
  email: String,
  address: String,
  city: String,
  state: String,
  pinCode: String,
  gstNumber: String,
}, baseOptions);

const invoiceItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  quantity: Number,
  unit: String,
  unitPrice: Number,
  sellingPrice: Number,
  totalPrice: Number,
  subtotal: Number,
  gstPercentage: Number,
  gstRate: Number,
  gstAmount: Number,
  lineTotal: Number,
  total: Number,
}, { _id: true, toJSON: baseOptions.toJSON, toObject: baseOptions.toObject });

invoiceItemSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: '_id',
  justOne: true,
});

const invoiceSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  farmerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  invoiceNumber: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  storeSnapshot: {
    storeName: String,
    ownerName: String,
    phone: String,
    address: String,
  },
  customerSnapshot: {
    name: String,
    mobileNumber: String,
    email: String,
    village: String,
    gstNumber: String,
  },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  totalQuantity: Number,
  subtotal: Number,
  gstAmount: Number,
  discount: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  totalAmount: Number,
  amountPaid: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'UNPAID' },
  paidAt: Date,
  status: { type: String, default: 'UNPAID' },
  paymentMethod: String,
  notes: String,
  pdfUrl: String,
  items: [invoiceItemSchema],
}, baseOptions);

invoiceSchema.index({ adminId: 1, storeId: 1, invoiceDate: -1, status: 1 });

invoiceSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true,
});

const paymentSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: Number,
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: String,
  referenceNumber: String,
  notes: String,
}, baseOptions);

paymentSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true,
});

paymentSchema.virtual('invoice', {
  ref: 'Invoice',
  localField: 'invoiceId',
  foreignField: '_id',
  justOne: true,
});

paymentSchema.index({ adminId: 1, storeId: 1, customerId: 1, invoiceId: 1, paymentDate: -1 });

const farmerDuePaymentSchema = new Schema({
  amount: { type: Number, required: true, min: 0.01 },
  paymentDate: { type: Date, default: Date.now },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Other'], default: 'Cash' },
  notes: { type: String, trim: true },
}, { _id: true, toJSON: baseOptions.toJSON, toObject: baseOptions.toObject });

const farmerDueInstallmentSchema = new Schema({
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paidAmount: { type: Number, default: 0 },
}, { _id: true, toJSON: baseOptions.toJSON, toObject: baseOptions.toObject });

const farmerDueSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  farmerName: { type: String, required: true, trim: true },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => /^[0-9]{10}$/.test(String(value || '').replace(/\D/g, '')),
      message: 'Phone number must be 10 digits',
    },
  },
  village: { type: String, required: true, trim: true },
  dueAmount: { type: Number, required: true, min: 0.01 },
  description: { type: String, trim: true },
  status: { type: String, enum: ['Pending', 'Partially Paid', 'Paid'], default: 'Pending', index: true },
  dueDate: { type: Date },
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  installments: [farmerDueInstallmentSchema],
  paymentHistory: [farmerDuePaymentSchema],
}, baseOptions);

farmerDueSchema.pre('validate', function calculateRemainingAmount() {
  const dueAmount = Number(this.dueAmount || 0);
  const paidAmount = Number(this.paidAmount || 0);
  this.remainingAmount = Number(Math.max(dueAmount - paidAmount, 0).toFixed(2));
  if (paidAmount > dueAmount) {
    this.invalidate('paidAmount', 'Paid amount cannot exceed due amount');
  }
  if (this.remainingAmount <= 0 && paidAmount > 0) {
    this.status = 'Paid';
  } else if (paidAmount > 0) {
    this.status = 'Partially Paid';
  } else {
    this.status = 'Pending';
  }
});

farmerDueSchema.index({ adminId: 1, storeId: 1, createdAt: -1 });
farmerDueSchema.index({ farmerName: 'text', phoneNumber: 'text', village: 'text', description: 'text' });

const purchaseItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  quantity: Number,
  unit: String,
  unitPrice: Number,
  purchasePrice: Number,
  sellingPrice: Number,
  totalPrice: Number,
  totalCost: Number,
  batchNumber: String,
  expiryDate: Date,
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
}, { _id: true, toJSON: baseOptions.toJSON, toObject: baseOptions.toObject });

purchaseItemSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: '_id',
  justOne: true,
});

const purchaseSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  purchaseNumber: { type: String, required: true, unique: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  purchaseDate: Date,
  deliveryDate: Date,
  supplierName: String,
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: Number,
  status: { type: String, default: 'PENDING' },
  stockApplied: { type: Boolean, default: false },
  receivedAt: Date,
  notes: String,
  items: [purchaseItemSchema],
}, baseOptions);

purchaseSchema.virtual('supplier', {
  ref: 'Supplier',
  localField: 'supplierId',
  foreignField: '_id',
  justOne: true,
});
purchaseSchema.index({ adminId: 1, storeId: 1, supplierId: 1, purchaseDate: -1, status: 1 });

const settingsSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', index: true, unique: true, sparse: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  shopName: { type: String, default: 'Agri Fertilizer Shop' },
  shopAddress: String,
  shopCity: String,
  shopState: String,
  shopPinCode: String,
  shopPhone: String,
  shopEmail: String,
  gstNumber: String,
  upiId: { type: String, trim: true },
  accountHolderName: { type: String, trim: true },
  bankName: { type: String, trim: true },
  customUpiQrImageUrl: String,
  invoicePrefix: { type: String, default: 'INV' },
  receiptPrefix: { type: String, default: 'RCP' },
  currencySymbol: { type: String, default: 'Rs.' },
  expiryAlertDays: { type: Number, default: 30 },
}, baseOptions);

const wishlistItemSchema = new Schema({
  farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
}, baseOptions);

wishlistItemSchema.index({ farmerId: 1, storeId: 1, productId: 1 }, { unique: true });

const availabilityRequestSchema = new Schema({
  farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  notifiedAt: Date,
}, baseOptions);

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  channels: [{ type: String, enum: ['IN_APP', 'SMS', 'EMAIL'] }],
  readAt: Date,
}, baseOptions);

const stockAlertSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  currentStock: Number,
  minimumStock: Number,
  alertType: String,
  isResolved: { type: Boolean, default: false },
  resolvedAt: Date,
}, baseOptions);

const backupSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  fileName: String,
  backupUrl: String,
  backupSize: Number,
  backupType: String,
  status: { type: String, default: 'COMPLETED' },
}, baseOptions);

const stockMovementSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  type: { type: String, enum: ['PURCHASE_IN', 'SALE_OUT', 'ADJUSTMENT'], required: true },
  referenceType: { type: String, enum: ['PURCHASE', 'INVOICE', 'ADJUSTMENT'], required: true },
  referenceId: { type: Schema.Types.ObjectId, required: true, index: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  note: String,
}, baseOptions);

stockMovementSchema.index({ adminId: 1, storeId: 1, productId: 1, createdAt: -1 });

const auditLogSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: Schema.Types.ObjectId, index: true },
  metadata: Schema.Types.Mixed,
}, baseOptions);

auditLogSchema.index({ adminId: 1, storeId: 1, createdAt: -1 });

const soilHealthCardSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
  farmerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  nitrogen: Number,
  phosphorus: Number,
  potassium: Number,
  organicCarbon: Number,
  pH: Number,
  micronutrients: Schema.Types.Mixed,
  crop: { type: String, required: true },
  acreage: { type: Number, required: true, default: 1 },
  soilType: String,
  recommendations: Schema.Types.Mixed,
}, baseOptions);

soilHealthCardSchema.index({ adminId: 1, storeId: 1, customerId: 1, createdAt: -1 });

const machinerySchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, enum: ['Tractor', 'Power tiller', 'Rotavator', 'Drone sprayer', 'Seed drill', 'Harvester', 'Water pump'] },
  rentalPricePerDay: { type: Number, required: true, min: 0 },
  description: String,
  image: String,
  location: String,
  availability: [
    {
      startDate: Date,
      endDate: Date,
    }
  ],
  ratings: [
    {
      renterId: { type: Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  averageRating: { type: Number, default: 5 },
}, baseOptions);

machinerySchema.index({ type: 1, rentalPricePerDay: 1 });

const machineryBookingSchema = new Schema({
  machineryId: { type: Schema.Types.ObjectId, ref: 'Machinery', required: true, index: true },
  renterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Completed'], default: 'Pending', index: true },
  notes: String,
}, baseOptions);

machineryBookingSchema.index({ machineryId: 1, status: 1 });

export const User = mongoose.model('User', userSchema);
export const PasswordResetOtp = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
export const FarmerAuthOtp = mongoose.model('FarmerAuthOtp', farmerAuthOtpSchema);
export const Store = mongoose.model('Store', storeSchema);
export const FarmerStoreLink = mongoose.model('FarmerStoreLink', farmerStoreLinkSchema);
export const Customer = mongoose.model('Customer', customerSchema);
export const CustomerPurchasedItem = mongoose.model('CustomerPurchasedItem', customerPurchasedItemSchema);
export const Product = mongoose.model('Product', productSchema);
export const Supplier = mongoose.model('Supplier', supplierSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
export const FarmerDue = mongoose.model('FarmerDue', farmerDueSchema);
export const Purchase = mongoose.model('Purchase', purchaseSchema);
export const Settings = mongoose.model('Settings', settingsSchema);
export const WishlistItem = mongoose.model('WishlistItem', wishlistItemSchema);
export const AvailabilityRequest = mongoose.model('AvailabilityRequest', availabilityRequestSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const StockAlert = mongoose.model('StockAlert', stockAlertSchema);
export const Backup = mongoose.model('Backup', backupSchema);
export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const SoilHealthCard = mongoose.model('SoilHealthCard', soilHealthCardSchema);
export const Machinery = mongoose.model('Machinery', machinerySchema);
export const MachineryBooking = mongoose.model('MachineryBooking', machineryBookingSchema);

const dailyCropPriceSchema = new Schema({
  cropId: { type: String, required: true, index: true },
  cropName: { type: String, required: true },
  variety: { type: String, default: 'FAQ' },
  grade: { type: String, default: 'FAQ' },
  marketId: { type: String, required: true, index: true },
  marketName: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  minPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  modalPrice: { type: Number, required: true },
  pricePerQuintal: { type: Number, required: true },
  date: { type: String, required: true },
  time: { type: String },
  dataSource: { type: String, default: 'AGMARKNET' },
  lastUpdated: { type: Date, default: Date.now }
}, baseOptions);

dailyCropPriceSchema.index({ cropId: 1, marketId: 1, variety: 1 }, { unique: true });

export const DailyCropPrice = mongoose.model('DailyCropPrice', dailyCropPriceSchema);

const locationNodeSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['STATE', 'DISTRICT', 'TALUK', 'VILLAGE'], required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'LocationNode', index: true },
  pincode: { type: String, index: true },
  lat: { type: Number },
  lon: { type: Number }
}, baseOptions);

locationNodeSchema.index({ name: 1, type: 1, parentId: 1 }, { unique: true });

export const LocationNode = mongoose.model('LocationNode', locationNodeSchema);

const mandiMarketSchema = new Schema({
  marketId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true }
}, baseOptions);

mandiMarketSchema.index({ state: 1, district: 1 });

export const MandiMarket = mongoose.model('MandiMarket', mandiMarketSchema);
