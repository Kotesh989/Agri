import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured. File upload features will not work.');
}

// Supabase client for public operations
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Supabase admin client for restricted operations
export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Upload file to Supabase Storage
export const uploadFile = async (bucket, path, file, options = {}) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, { upsert: false, ...options });

    if (error) {
      throw error;
    }

    const { data: signedUrl, error: signedError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, Number(process.env.SIGNED_URL_TTL_SECONDS || 3600));
    if (signedError) throw signedError;
    return signedUrl.signedUrl;
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }
};

// Delete file from Supabase Storage
export const deleteFile = async (bucket, path) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Supabase delete error:', error);
    throw error;
  }
};

export const createSignedUpload = async (bucket, path) => {
  if (!supabaseAdmin) throw new Error('Supabase not configured');
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
  if (error) throw error;
  return data;
};
