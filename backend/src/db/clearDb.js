import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const clearDb = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_fertilizer';
    console.log(`[Database Cleanup] Connecting to database: ${uri}...`);
    
    await mongoose.connect(uri);
    
    const collections = Object.keys(mongoose.connection.collections);
    console.log(`[Database Cleanup] Found ${collections.length} collections. Clearing documents...`);
    
    for (const name of collections) {
      const collection = mongoose.connection.collections[name];
      await collection.deleteMany({});
      console.log(`[Database Cleanup] Cleared all documents from collection: ${name}`);
    }
    
    console.log('[Database Cleanup] Database cleaned successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Database Cleanup] Error cleaning database:', err);
    process.exit(1);
  }
};

clearDb();
