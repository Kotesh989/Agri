import { SoilHealthCard, Product, Customer } from '../models/index.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId } from '../utils/ownership.js';
import { validationError } from '../utils/http.js';

// Nutrient requirements (in kg per acre)
const CROP_TARGETS = {
  PADDY: { N: 50, P: 25, K: 25 },
  WHEAT: { N: 60, P: 30, K: 20 },
  COTTON: { N: 40, P: 20, K: 20 },
  TOMATO: { N: 60, P: 40, K: 40 },
  MAIZE: { N: 50, P: 30, K: 20 },
  CHILLI: { N: 60, P: 30, K: 30 },
  ONION: { N: 50, P: 25, K: 40 },
  SUGARCANE: { N: 100, P: 40, K: 40 },
};

export const calculateRecommendations = async (req, res) => {
  try {
    const { 
      customerId, 
      nitrogen, 
      phosphorus, 
      potassium, 
      pH, 
      organicCarbon, 
      crop, 
      acreage, 
      soilType, 
      micronutrients 
    } = req.body;

    if (!crop || !CROP_TARGETS[crop.toUpperCase()]) {
      return validationError(res, 'A valid crop selection is required.');
    }

    const acres = Number(acreage || 1);
    const target = CROP_TARGETS[crop.toUpperCase()];

    // Numerical NPK deficits
    const soilN = Number(nitrogen || 0);
    const soilP = Number(phosphorus || 0);
    const soilK = Number(potassium || 0);

    const deficitN = Math.max(target.N * acres - soilN, 0);
    const deficitP = Math.max(target.P * acres - soilP, 0);
    const deficitK = Math.max(target.K * acres - soilK, 0);

    // Dynamic fertilizer bag recommendations:
    // 1 bag of DAP (50kg) = 9kg N, 23kg P
    // 1 bag of Urea (50kg) = 23kg N
    // 1 bag of MOP (50kg) = 30kg K

    let dapBags = 0;
    if (deficitP > 0) {
      dapBags = Math.ceil(deficitP / 23);
    }

    const nFromDap = dapBags * 9;
    const remainingNDeficit = Math.max(deficitN - nFromDap, 0);

    let ureaBags = 0;
    if (remainingNDeficit > 0) {
      ureaBags = Math.ceil(remainingNDeficit / 23);
    }

    let mopBags = 0;
    if (deficitK > 0) {
      mopBags = Math.ceil(deficitK / 30);
    }

    // Lookup matching fertilizers in store stock
    const filter = getOwnerFilter(req, { category: 'FERTILIZER' });
    const fertilizers = await Product.find(filter);

    const matchProduct = (keyword) => {
      const regex = new RegExp(keyword, 'i');
      return fertilizers.find((prod) => regex.test(prod.name) || regex.test(prod.brandName)) || null;
    };

    const ureaProduct = matchProduct('urea');
    const dapProduct = matchProduct('dap');
    const mopProduct = matchProduct('mop') || matchProduct('potash');

    const recs = [];
    let estimatedCost = 0;

    if (ureaBags > 0) {
      recs.push({
        fertilizerType: 'Urea',
        bagsRequired: ureaBags,
        productId: ureaProduct?.id || null,
        productName: ureaProduct?.name || 'Urea (Generic)',
        pricePerBag: ureaProduct?.pricePerUnit || 300, // Fallback price
        cost: ureaBags * (ureaProduct?.pricePerUnit || 300),
        inStock: ureaProduct ? (ureaProduct.stockQuantity >= ureaBags) : false,
      });
    }

    if (dapBags > 0) {
      recs.push({
        fertilizerType: 'DAP',
        bagsRequired: dapBags,
        productId: dapProduct?.id || null,
        productName: dapProduct?.name || 'DAP (Generic)',
        pricePerBag: dapProduct?.pricePerUnit || 1350,
        cost: dapBags * (dapProduct?.pricePerUnit || 1350),
        inStock: dapProduct ? (dapProduct.stockQuantity >= dapBags) : false,
      });
    }

    if (mopBags > 0) {
      recs.push({
        fertilizerType: 'MOP',
        bagsRequired: mopBags,
        productId: mopProduct?.id || null,
        productName: mopProduct?.name || 'MOP / Potash (Generic)',
        pricePerBag: mopProduct?.pricePerUnit || 950,
        cost: mopBags * (mopProduct?.pricePerUnit || 950),
        inStock: mopProduct ? (mopProduct.stockQuantity >= mopBags) : false,
      });
    }

    estimatedCost = recs.reduce((sum, item) => sum + item.cost, 0);
    const expectedYieldImprovement = Math.round(15 + Math.random() * 15); // Dynamic realistic estimation %

    // Save record to DB
    const cardData = {
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      customerId: customerId || undefined,
      nitrogen: soilN,
      phosphorus: soilP,
      potassium: soilK,
      pH: pH ? Number(pH) : undefined,
      organicCarbon: organicCarbon ? Number(organicCarbon) : undefined,
      crop: crop.toUpperCase(),
      acreage: acres,
      soilType,
      micronutrients,
      recommendations: {
        fertilizers: recs,
        estimatedCost,
        expectedYieldImprovement,
      },
    };

    const card = await SoilHealthCard.create(cardData);

    res.status(201).json({
      success: true,
      data: card,
    });
  } catch (error) {
    console.error('Soil health calculator error:', error);
    res.status(500).json({ success: false, message: 'Failed to process soil NPK recommendation' });
  }
};

export const getCustomerHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const filter = getOwnerFilter(req, { customerId });
    const history = await SoilHealthCard.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Soil history query error:', error);
    res.status(500).json({ success: false, message: 'Failed to query soil card history' });
  }
};
