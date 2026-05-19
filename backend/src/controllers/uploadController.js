import { createSignedUpload } from '../utils/supabase.js';

const bucketByType = {
  PROFILE_PHOTO: 'profile-photos',
  PRODUCT_IMAGE: 'product-images',
  STORE_LOGO: 'store-logos',
  INVOICE_PDF: 'invoices',
  BACKUP: 'backups',
};

const maxBytesByType = {
  PROFILE_PHOTO: 2 * 1024 * 1024,
  PRODUCT_IMAGE: 5 * 1024 * 1024,
  STORE_LOGO: 2 * 1024 * 1024,
  INVOICE_PDF: 10 * 1024 * 1024,
  BACKUP: 50 * 1024 * 1024,
};

export const createUploadUrl = async (req, res) => {
  try {
    const type = String(req.body.type || '').toUpperCase();
    const fileName = String(req.body.fileName || '').replace(/[^a-zA-Z0-9._-]/g, '-');
    const size = Number(req.body.size || 0);
    if (!bucketByType[type] || !fileName) return res.status(400).json({ success: false, message: 'Valid upload type and file name are required' });
    if (size <= 0 || size > maxBytesByType[type]) return res.status(400).json({ success: false, message: 'File size is not allowed' });
    const path = `${req.storeId}/${Date.now()}-${fileName}`;
    const data = await createSignedUpload(bucketByType[type], path);
    res.json({ success: true, data: { bucket: bucketByType[type], path, ...data } });
  } catch (error) {
    console.error('Create upload URL error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
