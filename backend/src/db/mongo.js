import mongoose from 'mongoose';
import { Customer } from '../models/index.js';

export const connectMongo = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_fertilizer';

  await mongoose.connect(uri);
  await Customer.collection.dropIndex('mobileNumber_1').catch((error) => {
    if (error.codeName !== 'IndexNotFound') {
      console.warn('Could not drop legacy global customer mobile index:', error.message);
    }
  });
  await Customer.syncIndexes();
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
};
