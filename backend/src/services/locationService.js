import { LocationNode, MandiMarket } from '../models/index.js';
import { LOCATIONS } from '../data/locationDatabase.js';
import { MARKETS } from '../data/marketDatabase.js';

// Seed states on demand if empty
export async function getOrSeedStates() {
  const count = await LocationNode.countDocuments({ type: 'STATE' });
  if (count > 0) {
    return LocationNode.find({ type: 'STATE' }).sort({ name: 1 });
  }

  console.log('[LocationService] Seeding India State/UT nodes...');
  const stateNodes = LOCATIONS.states['India'].map(name => ({
    name,
    type: 'STATE',
    parentId: null
  }));

  await LocationNode.insertMany(stateNodes, { ordered: false }).catch(() => {});
  return LocationNode.find({ type: 'STATE' }).sort({ name: 1 });
}

// Seed districts for a state on demand if empty
export async function getOrSeedDistricts(stateId) {
  const stateNode = await LocationNode.findById(stateId);
  if (!stateNode || stateNode.type !== 'STATE') {
    throw new Error('Invalid state node');
  }

  const districts = LOCATIONS.districts[stateNode.name] || [];
  
  // Fetch existing districts for this state to find missing ones
  const existingNodes = await LocationNode.find({ type: 'DISTRICT', parentId: stateId });
  const existingNames = new Set(existingNodes.map(d => d.name.toLowerCase()));

  const missingDistricts = districts.filter(d => !existingNames.has(d.toLowerCase()));
  
  if (missingDistricts.length > 0) {
    console.log(`[LocationService] Seeding ${missingDistricts.length} missing districts for: ${stateNode.name}...`);
    const districtNodes = missingDistricts.map(name => ({
      name,
      type: 'DISTRICT',
      parentId: stateId
    }));
    await LocationNode.insertMany(districtNodes, { ordered: false }).catch(() => {});
  }

  return LocationNode.find({ type: 'DISTRICT', parentId: stateId }).sort({ name: 1 });
}

// Seed MandiMarkets in MongoDB if empty
export async function getOrSeedMandiMarkets() {
  const count = await MandiMarket.countDocuments();
  if (count > 0) {
    return;
  }

  console.log('[LocationService] Seeding MandiMarkets collection...');
  const marketDocs = MARKETS.map(m => ({
    marketId: m.id,
    name: m.name,
    state: m.state,
    district: m.district,
    lat: m.lat,
    lon: m.lon
  }));

  await MandiMarket.insertMany(marketDocs, { ordered: false }).catch(() => {});
}

// Resolves a full address hierarchy State -> District -> Taluk -> Village and caches new nodes in MongoDB
export async function resolveOrSeedLocationContext(stateName, districtName, talukName, villageName, pincode) {
  if (!stateName) return null;

  // 1. Resolve State
  let stateNode = await LocationNode.findOne({ name: { $regex: new RegExp(`^${stateName}$`, 'i') }, type: 'STATE' });
  if (!stateNode) {
    stateNode = await LocationNode.create({ name: stateName, type: 'STATE' });
  }

  // 2. Resolve District
  let districtNode = null;
  if (districtName) {
    districtNode = await LocationNode.findOne({ 
      name: { $regex: new RegExp(`^${districtName}$`, 'i') }, 
      type: 'DISTRICT', 
      parentId: stateNode._id 
    });
    if (!districtNode) {
      districtNode = await LocationNode.create({ name: districtName, type: 'DISTRICT', parentId: stateNode._id });
    }
  }

  // 3. Resolve Taluk
  let talukNode = null;
  if (talukName && districtNode) {
    talukNode = await LocationNode.findOne({ 
      name: { $regex: new RegExp(`^${talukName}$`, 'i') }, 
      type: 'TALUK', 
      parentId: districtNode._id 
    });
    if (!talukNode) {
      // Attempt to resolve coordinates of Taluk via Nominatim
      let lat = null, lon = null;
      try {
        const searchQuery = encodeURIComponent(`${talukName}, ${districtName}, ${stateName}, India`);
        const searchRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&limit=1`);
        if (searchRes.ok) {
          const data = await searchRes.json();
          if (data?.[0]) {
            lat = Number(data[0].lat);
            lon = Number(data[0].lon);
          }
        }
      } catch (err) {
        console.warn(`[LocationService] Taluk geocoding failed: ${talukName}`, err.message);
      }

      talukNode = await LocationNode.create({ 
        name: talukName, 
        type: 'TALUK', 
        parentId: districtNode._id,
        lat,
        lon
      });
    }
  }

  // 4. Resolve Village
  let villageNode = null;
  if (villageName && talukNode) {
    villageNode = await LocationNode.findOne({ 
      name: { $regex: new RegExp(`^${villageName}$`, 'i') }, 
      type: 'VILLAGE', 
      parentId: talukNode._id 
    });
    if (!villageNode) {
      villageNode = await LocationNode.create({ 
        name: villageName, 
        type: 'VILLAGE', 
        parentId: talukNode._id, 
        pincode,
        lat: talukNode.lat,
        lon: talukNode.lon
      });
    }
  }

  return {
    state: stateNode,
    district: districtNode,
    taluk: talukNode,
    village: villageNode
  };
}
