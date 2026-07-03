import mongoose from 'mongoose';
import { LocationNode } from '../models/index.js';
import { resolvePincode } from '../data/locationDatabase.js';
import { getOrSeedStates, getOrSeedDistricts, resolveOrSeedLocationContext } from '../services/locationService.js';

const setCacheHeaders = (res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
};

export const getCountries = async (req, res) => {
  try {
    setCacheHeaders(res);
    res.json({ success: true, data: ['India'] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving countries' });
  }
};

export const getStates = async (req, res) => {
  try {
    const states = await getOrSeedStates();
    setCacheHeaders(res);
    res.json({ success: true, data: states });
  } catch (error) {
    console.error('Error retrieving states:', error);
    res.status(500).json({ success: false, message: 'Error retrieving states' });
  }
};

export const getDistricts = async (req, res) => {
  try {
    const { stateId, state } = req.query;

    let targetStateNode = null;
    if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
      targetStateNode = await LocationNode.findById(stateId);
    }
    
    if (!targetStateNode && (stateId || state)) {
      const name = stateId || state;
      targetStateNode = await LocationNode.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, type: 'STATE' });
    }

    if (!targetStateNode) {
      return res.json({ success: true, data: [] });
    }

    const districts = await getOrSeedDistricts(targetStateNode._id);
    setCacheHeaders(res);
    res.json({ success: true, data: districts });
  } catch (error) {
    console.error('Error retrieving districts:', error);
    res.status(500).json({ success: false, message: 'Error retrieving districts' });
  }
};

export const getTaluks = async (req, res) => {
  try {
    const { districtId, district } = req.query;

    let parentId = districtId;
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      const node = await LocationNode.findOne({ name: { $regex: new RegExp(`^${parentId}$`, 'i') }, type: 'DISTRICT' });
      parentId = node ? node._id : null;
    } else if (!parentId && district) {
      const node = await LocationNode.findOne({ name: { $regex: new RegExp(`^${district}$`, 'i') }, type: 'DISTRICT' });
      parentId = node ? node._id : null;
    }

    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.json({ success: true, data: [] });
    }

    const taluks = await LocationNode.find({ parentId, type: 'TALUK' }).sort({ name: 1 });
    setCacheHeaders(res);
    res.json({ success: true, data: taluks });
  } catch (error) {
    console.error('Error retrieving taluks:', error);
    res.status(500).json({ success: false, message: 'Error retrieving taluks' });
  }
};

export const getVillages = async (req, res) => {
  try {
    const { talukId, taluk } = req.query;

    let parentId = talukId;
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      const node = await LocationNode.findOne({ name: { $regex: new RegExp(`^${parentId}$`, 'i') }, type: 'TALUK' });
      parentId = node ? node._id : null;
    } else if (!parentId && taluk) {
      const node = await LocationNode.findOne({ name: { $regex: new RegExp(`^${taluk}$`, 'i') }, type: 'TALUK' });
      parentId = node ? node._id : null;
    }

    if (!parentId || !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.json({ success: true, data: [] });
    }

    const villages = await LocationNode.find({ parentId, type: 'VILLAGE' }).sort({ name: 1 });
    setCacheHeaders(res);
    res.json({ success: true, data: villages });
  } catch (error) {
    console.error('Error retrieving villages:', error);
    res.status(500).json({ success: false, message: 'Error retrieving villages' });
  }
};

export const searchLocation = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const matches = await LocationNode.find({
      name: { $regex: new RegExp(q.trim(), 'i') }
    }).limit(20);

    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error searching locations' });
  }
};

export const lookupPincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!pincode || pincode.length !== 6) {
      return res.status(400).json({ success: false, message: 'Valid 6-digit PIN code is required' });
    }

    // Try resolve from database-backed locationNodes first
    const resolvedNode = await LocationNode.findOne({ pincode, type: 'VILLAGE' }).populate({
      path: 'parentId',
      populate: {
        path: 'parentId',
        populate: { path: 'parentId' }
      }
    });

    if (resolvedNode) {
      const talukNode = resolvedNode.parentId;
      const districtNode = talukNode?.parentId;
      const stateNode = districtNode?.parentId;

      return res.json({
        success: true,
        data: {
          country: 'India',
          state: stateNode?.name || '',
          district: districtNode?.name || '',
          taluk: talukNode?.name || '',
          village: resolvedNode.name,
          pincode
        }
      });
    }

    // Call Government Postal API
    try {
      const postalUrl = `https://api.postalpincode.in/pincode/${pincode}`;
      const postalRes = await fetch(postalUrl);
      if (postalRes.ok) {
        const json = await postalRes.json();
        if (json[0] && json[0].Status === 'Success' && json[0].PostOffice?.length > 0) {
          const po = json[0].PostOffice[0];
          
          // Seed it dynamically in MongoDB for future fast caches
          await resolveOrSeedLocationContext(po.State, po.District, po.Block || po.Taluk || po.Division, po.Name, pincode);

          return res.json({
            success: true,
            data: {
              country: 'India',
              state: po.State,
              district: po.District,
              taluk: po.Block || po.Taluk || po.Division,
              village: po.Name,
              pincode
            }
          });
        }
      }
    } catch (apiErr) {
      console.warn('Govt Postal API lookup failed, falling back:', apiErr.message);
    }

    // Direct fallback from static db lookup
    const localResolved = resolvePincode(pincode);
    if (localResolved) {
      return res.json({ success: true, data: localResolved });
    }

    res.status(404).json({ success: false, message: 'PIN code not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error looking up PIN code' });
  }
};
