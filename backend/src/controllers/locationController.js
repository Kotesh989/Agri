import { LOCATIONS, FALLBACK_VILLAGES, resolvePincode } from '../data/locationDatabase.js';

// Setup Cache Headers
const setCacheHeaders = (res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
};

export const getCountries = async (req, res) => {
  try {
    setCacheHeaders(res);
    res.json({ success: true, data: LOCATIONS.countries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving countries' });
  }
};

export const getStates = async (req, res) => {
  try {
    const { country = 'India' } = req.query;
    const statesList = LOCATIONS.states[country] || [];
    setCacheHeaders(res);
    res.json({ success: true, data: statesList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving states' });
  }
};

export const getDistricts = async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).json({ success: false, message: 'State parameter is required' });
    }
    const districtsList = LOCATIONS.districts[state] || [];
    
    // Case-insensitive search filter if present
    const { search = '' } = req.query;
    let filtered = [...districtsList];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d => d.toLowerCase().includes(q));
    }

    setCacheHeaders(res);
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving districts' });
  }
};

export const getTaluks = async (req, res) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.status(400).json({ success: false, message: 'District parameter is required' });
    }
    const taluksList = LOCATIONS.taluks[district] || [];

    const { search = '' } = req.query;
    let filtered = [...taluksList];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => t.toLowerCase().includes(q));
    }

    setCacheHeaders(res);
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving taluks' });
  }
};

export const getHoblis = async (req, res) => {
  try {
    const { taluk } = req.query;
    if (!taluk) {
      return res.status(400).json({ success: false, message: 'Taluk parameter is required' });
    }
    const hoblisList = LOCATIONS.hoblis[taluk] || [];

    const { search = '' } = req.query;
    let filtered = [...hoblisList];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(h => h.toLowerCase().includes(q));
    }

    setCacheHeaders(res);
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving hoblis' });
  }
};

export const getVillages = async (req, res) => {
  try {
    const { hobli, taluk } = req.query;
    
    let villagesList = [];
    if (hobli && LOCATIONS.villages[hobli]) {
      villagesList = LOCATIONS.villages[hobli];
    } else if (taluk && FALLBACK_VILLAGES[taluk]) {
      villagesList = FALLBACK_VILLAGES[taluk];
    } else if (taluk) {
      // If the taluk has registered hoblis, check them all
      const childHoblis = LOCATIONS.hoblis[taluk] || [];
      childHoblis.forEach(h => {
        if (LOCATIONS.villages[h]) {
          villagesList = [...villagesList, ...LOCATIONS.villages[h]];
        }
      });
    }

    const { search = '' } = req.query;
    let filtered = [...villagesList];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(v => v.name.toLowerCase().includes(q));
    }

    setCacheHeaders(res);
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving villages' });
  }
};

export const lookupPincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!pincode || pincode.length !== 6) {
      return res.status(400).json({ success: false, message: 'Valid 6-digit PIN code is required' });
    }

    // Try resolving from database first
    const localResolved = resolvePincode(pincode);
    if (localResolved) {
      return res.json({ success: true, data: localResolved });
    }

    // Fallback lookup using Govt Postal Pin Code API (free, open)
    try {
      const postalUrl = `https://api.postalpincode.in/pincode/${pincode}`;
      const postalRes = await fetch(postalUrl);
      if (postalRes.ok) {
        const json = await postalRes.json();
        if (json[0] && json[0].Status === 'Success' && json[0].PostOffice?.length > 0) {
          const po = json[0].PostOffice[0];
          return res.json({
            success: true,
            data: {
              country: 'India',
              state: po.State,
              district: po.District,
              taluk: po.Block || po.Taluk || po.Division,
              hobli: '',
              village: po.Name,
              pincode
            }
          });
        }
      }
    } catch (apiErr) {
      console.warn('Govt Postal API lookup failed, falling back:', apiErr.message);
    }

    res.status(404).json({ success: false, message: 'PIN code not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error looking up PIN code' });
  }
};
