import { Product } from '../models/index.js';
import { getOwnerFilter } from '../utils/ownership.js';
import { validationError } from '../utils/http.js';

// Pre-defined rules-based diagnoses for demonstration / fallback
const DISEASE_DATABASE = {
  TOMATO: [
    {
      symptomKeywords: ['yellow', 'spot', 'black', 'brown'],
      diseaseName: 'Tomato Early Blight',
      cause: 'Alternaria solani fungus, thriving in humid conditions.',
      prevention: 'Drip irrigation, crop rotation, and removing lower leaves.',
      recommendedPesticide: '',
      recommendedFungicide: 'Mancozeb or Chlorothalonil',
      nutrientDeficiency: 'None',
    },
    {
      symptomKeywords: ['white', 'powder', 'mildew', 'dust'],
      diseaseName: 'Tomato Powdery Mildew',
      cause: 'Leveillula taurica fungus.',
      prevention: 'Ensure proper plant spacing and ventilation.',
      recommendedPesticide: '',
      recommendedFungicide: 'Wettable Sulfur or Myclobutanil',
      nutrientDeficiency: 'None',
    }
  ],
  COTTON: [
    {
      symptomKeywords: ['curl', 'wrinkle', 'stunt', 'leaf'],
      diseaseName: 'Cotton Leaf Curl Virus (CLCuV)',
      cause: 'Begomovirus transmitted by whiteflies.',
      prevention: 'Eradicate weeds, use resistant varieties, control whitefly vectors.',
      recommendedPesticide: 'Imidacloprid or Acetamiprid',
      recommendedFungicide: '',
      nutrientDeficiency: 'None',
    }
  ],
  PADDY: [
    {
      symptomKeywords: ['blast', 'spot', 'lesion', 'neck', 'brown'],
      diseaseName: 'Rice Blast',
      cause: 'Magnaporthe oryzae fungus.',
      prevention: 'Avoid excessive nitrogen application, maintain water levels.',
      recommendedPesticide: '',
      recommendedFungicide: 'Tricyclazole or Azoxystrobin',
      nutrientDeficiency: 'None',
    }
  ],
  WHEAT: [
    {
      symptomKeywords: ['rust', 'orange', 'yellow', 'stripe', 'brown'],
      diseaseName: 'Wheat Rust (Leaf Rust)',
      cause: 'Puccinia triticina fungus.',
      prevention: 'Use certified rust-resistant seed variants.',
      recommendedPesticide: '',
      recommendedFungicide: 'Tebuconazole or Propiconazole',
      nutrientDeficiency: 'None',
    }
  ],
  MAIZE: [
    {
      symptomKeywords: ['chew', 'armyworm', 'hole', 'caterpillar', 'worm'],
      diseaseName: 'Fall Armyworm Infestation',
      cause: 'Spodoptera frugiperda pest.',
      prevention: 'Intercrop with leguminous plants, early monitoring.',
      recommendedPesticide: 'Chlorantraniliprole or Spinetoram',
      recommendedFungicide: '',
      nutrientDeficiency: 'None',
    }
  ],
  CHILLI: [
    {
      symptomKeywords: ['curl', 'mite', 'thrip', 'shrink', 'yellow'],
      diseaseName: 'Chilli Leaf Curl Virus & Mite attack',
      cause: 'Thrips and mites sucking leaf sap.',
      prevention: 'Install yellow sticky traps, maintain field sanitation.',
      recommendedPesticide: 'Thiamethoxam or Diafenthiuron',
      recommendedFungicide: '',
      nutrientDeficiency: 'None',
    }
  ]
};

const defaultAdvisory = (crop) => ({
  cropName: crop,
  diseaseName: 'Minor Leaf Spot & Nutrient Exhaustion',
  confidence: 0.72,
  cause: 'Overwatering or mild nitrogen deficiency.',
  prevention: 'Optimize irrigation intervals and apply organic compost.',
  recommendedPesticide: 'Neem Oil (Organic)',
  recommendedFungicide: 'Copper Oxychloride',
  nutrientDeficiency: 'Nitrogen Deficiency',
});

export const scanCropDisease = async (req, res) => {
  try {
    const { image, cropName, symptoms } = req.body;

    if (!cropName) {
      return validationError(res, 'Crop name is required.');
    }

    const cropKey = String(cropName).toUpperCase();
    const symptomDesc = String(symptoms || '').toLowerCase();

    let analysis = null;

    const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
    if (apiKey && image) {
      // Query Gemini Pro Vision (via fetch)
      try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { 
                    text: `You are an AI Agronomist. Analyze this crop leaf image. The crop is "${cropName}" and user noted symptoms: "${symptoms}". 
                    Diagnose the disease or nutrient deficiency. 
                    Format your response strictly as a JSON object, containing:
                    {
                      "diseaseName": "Name of the disease",
                      "cause": "Possible cause",
                      "prevention": "Prevention steps",
                      "recommendedPesticide": "Name of recommended pesticide or 'None'",
                      "recommendedFungicide": "Name of recommended fungicide or 'None'",
                      "nutrientDeficiency": "Identify deficient nutrient or 'None'",
                      "confidence": 0.95
                    }` 
                  },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Data,
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(jsonText.match(/\{[\s\S]*\}/)?.[0] || '{}');
          if (parsed.diseaseName) {
            analysis = {
              cropName: cropKey,
              diseaseName: parsed.diseaseName,
              confidence: Number(parsed.confidence || 0.9),
              cause: parsed.cause || 'Pathogen attack.',
              prevention: parsed.prevention || 'Maintain farm sanitation.',
              recommendedPesticide: parsed.recommendedPesticide || '',
              recommendedFungicide: parsed.recommendedFungicide || '',
              nutrientDeficiency: parsed.nutrientDeficiency || 'None',
            };
          }
        }
      } catch (err) {
        console.warn('Gemini vision API scan failed, falling back to database parser:', err);
      }
    }

    // Rules-based database fallback if Gemini is not configured or failed
    if (!analysis) {
      const candidates = DISEASE_DATABASE[cropKey] || [];
      const match = candidates.find((item) => 
        item.symptomKeywords.some((keyword) => symptomDesc.includes(keyword))
      ) || candidates[0];

      if (match) {
        analysis = {
          cropName: cropKey,
          diseaseName: match.diseaseName,
          confidence: 0.88,
          cause: match.cause,
          prevention: match.prevention,
          recommendedPesticide: match.recommendedPesticide,
          recommendedFungicide: match.recommendedFungicide,
          nutrientDeficiency: match.nutrientDeficiency,
        };
      } else {
        analysis = defaultAdvisory(cropKey);
      }
    }

    // Find matching products in store inventory (PESTICIDE category)
    const storePesticides = await Product.find(getOwnerFilter(req, { category: 'PESTICIDE' }));

    const searchInventory = (chemName) => {
      if (!chemName || chemName === 'None') return [];
      const terms = chemName.split(/\s+or\s+|\s*,\s*/i);
      const matches = [];
      for (const term of terms) {
        const cleaned = term.trim().toLowerCase();
        if (cleaned.length < 3) continue;
        const regex = new RegExp(cleaned, 'i');
        const found = storePesticides.filter(
          (prod) => regex.test(prod.name) || regex.test(prod.brandName) || regex.test(prod.description)
        );
        matches.push(...found);
      }
      // Remove duplicates
      return Array.from(new Set(matches.map((p) => p.id)))
        .map((id) => matches.find((m) => m.id === id));
    };

    const matchedPesticides = searchInventory(analysis.recommendedPesticide);
    const matchedFungicides = searchInventory(analysis.recommendedFungicide);

    res.json({
      success: true,
      analysis,
      inventoryMatches: {
        pesticides: matchedPesticides,
        fungicides: matchedFungicides,
      }
    });
  } catch (error) {
    console.error('Crop disease scan error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete leaf analysis scan.' });
  }
};
