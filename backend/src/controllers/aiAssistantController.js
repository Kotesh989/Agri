import { Customer, FarmerDue, Invoice, Product } from '../models/index.js';
import { getDueSummaryData, listDueRecords, recordDuePayment, updateDueRecord } from './farmerDueController.js';
import { validationError } from '../utils/http.js';
import { getOwnerFilter, getRequestAdminId } from '../utils/ownership.js';

const AI_INTENTS = [
  'SEARCH_DUES',
  'DUE_SUMMARY',
  'CLEAR_DUE',
  'RECORD_DUE_PAYMENT',
  'SEARCH_PRODUCT',
  'LOW_STOCK',
  'TODAY_SALES',
  'SEARCH_FARMER',
  'NAVIGATE',
  'UNKNOWN',
];

const DESTRUCTIVE_INTENTS = new Set(['CLEAR_DUE']);

const escapeRegex = (value) => String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeNumber = (value) => {
  const normalized = String(value ?? '').replace(/[^\d.]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
};

const parseJsonContent = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    const match = String(content || '').match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
};

const normalizeText = (text) => String(text || '').toLowerCase().trim();

export const fallbackIntentForTranscript = (transcript) => {
  const normalized = normalizeText(transcript);
  const lower = normalized.replace(/\s+/g, ' ');

  if (/clear|cliear|close|ಮುಗಿಸ|ಕ್ಲಿಯರ್|ಪಾವತ/i.test(lower)) {
    const rawTokens = transcript
      .replace(/(?:please|kindly|pls|plz)\s+/gi, '')
      .replace(/(?:clear|cliear|close|due|payment|paid|pay|ಬಾಕಿ|ಕ್ಲಿಯರ್|ಮುಗಿಸ|ಮಾಡಿ|ಅವರ|for|of|the|this|that)\s+/gi, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const farmerName = rawTokens.find((token) => token.length > 1) || 'unknown';
    return {
      intent: 'CLEAR_DUE',
      entities: { farmerName: farmerName.replace(/[^a-zA-Z\u0C80-\u0CFF]/g, '').trim() },
      missingFields: farmerName === 'unknown' ? ['farmerName'] : [],
      confidence: 0.7,
      requiresConfirmation: true,
      reply: 'I can clear the due once you confirm.',
    };
  }

  if (/pending|ಬಾಕಿ|dues|due|unpaid|ಪಾವತಿ|ಪಾವತಿಸ|show|ಹುಡುಕಿ|search/i.test(lower)) {
    const villageMatch = lower.match(/(?:from|in|ಗ್ರಾಮ|ದೇಶ|ಮೈಸೂರು|mysuru|ಮೈಸೂರು Stadt|ಮೈಸೂರು)/i);
    const statusMatch = lower.match(/pending|paid|partially|ಬಾಕಿ|ಪಾವತಿಸಲಾಗಿದೆ|ಭಾಗಶಃ/i);
    return {
      intent: 'SEARCH_DUES',
      entities: {
        village: villageMatch ? 'Mysuru' : undefined,
        status: statusMatch ? 'Pending' : undefined,
      },
      missingFields: [],
      confidence: 0.68,
      requiresConfirmation: false,
      reply: 'I will look up the matching dues.',
    };
  }

  if (/product|stock|ಉತ್ಪನ್ನ|ಸ್ಟಾಕ್|ಯೂರಿಯಾ|dap|urea|ದಾಪ/i.test(lower)) {
    return {
      intent: 'SEARCH_PRODUCT',
      entities: { productName: lower },
      missingFields: [],
      confidence: 0.65,
      requiresConfirmation: false,
      reply: 'I will search the product inventory.',
    };
  }

  return {
    intent: 'UNKNOWN',
    entities: {},
    missingFields: [],
    confidence: 0.4,
    requiresConfirmation: false,
    reply: 'I could not understand that request. Please try again in Kannada or English.',
  };
};

const buildSystemPrompt = () => `
You are an AI assistant for an Agri Fertilizer Shop ERP.
Understand Kannada, English, and mixed Kannada-English.
Do not execute anything. Return only JSON.
Extract intent and entities from the user's natural language.
Never invent database IDs. If an entity is missing, put it in missingFields.
Supported intents: ${AI_INTENTS.join(', ')}.
Useful entities: farmerName, phoneNumber, village, productName, amount, status, dateRange, route.
For delete/clear actions set requiresConfirmation true.
JSON shape:
{
  "intent": "SEARCH_DUES",
  "entities": {},
  "missingFields": [],
  "confidence": 0.0,
  "requiresConfirmation": false,
  "reply": "short response in the user's language"
}
`;

const callLlm = async ({ transcript, conversation = [] }) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    return {
      intent: 'UNKNOWN',
      entities: {},
      missingFields: [],
      confidence: 0,
      requiresConfirmation: false,
      reply: 'AI service is not configured. Please set a Gemini or OpenAI API key.',
    };
  }

  const provider = process.env.AI_PROVIDER || 'gemini';
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (provider === 'gemini') {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${buildSystemPrompt()}\n\nConversation:\n${conversation.slice(-8).map((message) => `${message.role}: ${message.content}`).join('\n')}\n\nUser: ${transcript}` }] },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.warn('Gemini AI provider error, falling back to deterministic parser:', body.slice(0, 200));
        return fallbackIntentForTranscript(transcript);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseJsonContent(content);
      if (!parsed || !AI_INTENTS.includes(parsed.intent)) {
        return fallbackIntentForTranscript(transcript);
      }
      return {
        intent: parsed.intent,
        entities: parsed.entities || {},
        missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
        confidence: Number(parsed.confidence || 0),
        requiresConfirmation: Boolean(parsed.requiresConfirmation),
        reply: parsed.reply || '',
      };
    } catch (error) {
      console.warn('Gemini request failed, falling back to deterministic parser:', error.message);
      return fallbackIntentForTranscript(transcript);
    }
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        ...conversation.slice(-8).map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: String(message.content || ''),
        })),
        { role: 'user', content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider error: ${response.status} ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const parsed = parseJsonContent(data.choices?.[0]?.message?.content);
  if (!parsed || !AI_INTENTS.includes(parsed.intent)) {
    return { intent: 'UNKNOWN', entities: {}, missingFields: [], confidence: 0, reply: 'I could not understand that request.' };
  }
  return {
    intent: parsed.intent,
    entities: parsed.entities || {},
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
    confidence: Number(parsed.confidence || 0),
    requiresConfirmation: Boolean(parsed.requiresConfirmation),
    reply: parsed.reply || '',
  };
};

const findOneDue = async (req, entities) => {
  if (entities.dueId) return FarmerDue.findOne(getOwnerFilter(req, { _id: entities.dueId }));
  if (!entities.farmerName && !entities.phoneNumber) return null;
  const filter = getOwnerFilter(req);
  const or = [];
  if (entities.farmerName) or.push({ farmerName: new RegExp(escapeRegex(entities.farmerName), 'i') });
  if (entities.phoneNumber) or.push({ phoneNumber: new RegExp(escapeRegex(String(entities.phoneNumber).replace(/\D/g, '')), 'i') });
  filter.$or = or;
  return FarmerDue.findOne(filter).sort({ remainingAmount: -1, createdAt: -1 });
};

const normalizeDueEntities = (entities = {}) => ({
  ...entities,
  farmerName: entities.farmerName || entities.farmer || entities.name,
  phoneNumber: entities.phoneNumber || entities.phone || entities.mobile,
  village: entities.village || entities.location,
  amount: entities.amount || entities.paymentAmount || entities.value,
  status: entities.status || entities.state,
});

const executeIntent = async (req, aiResult, confirmed) => {
  const entities = normalizeDueEntities(aiResult.entities || {});
  if (DESTRUCTIVE_INTENTS.has(aiResult.intent) && !confirmed) {
    return {
      ...aiResult,
      confirmationRequired: true,
      executed: false,
      reply: aiResult.reply || 'Are you sure you want to continue?',
    };
  }

  if (aiResult.missingFields?.length) {
    return { ...aiResult, executed: false, reply: aiResult.reply || `Missing: ${aiResult.missingFields.join(', ')}` };
  }

  switch (aiResult.intent) {
    case 'SEARCH_DUES': {
      const searchReq = { ...req, query: { ...req.query, search: entities.farmerName || entities.village || entities.phoneNumber || '', status: entities.status || req.query.status, page: 1, limit: 10, sort: 'latest' } };
      const { dues } = await listDueRecords(searchReq);
      return { ...aiResult, executed: true, data: dues, reply: dues.length ? `Found ${dues.length} due records.` : 'No due records found.' };
    }
    case 'DUE_SUMMARY': {
      const summary = await getDueSummaryData(req);
      return { ...aiResult, executed: true, data: summary, reply: `Total due is ${summary.totalDueAmount.toFixed(2)} across ${summary.totalPendingFarmers + summary.totalPartiallyPaid + summary.totalPaidToday} records.` };
    }
    case 'CLEAR_DUE': {
      const due = await findOneDue(req, entities);
      if (!due) return { ...aiResult, executed: false, reply: 'Due record not found.' };
      const amount = Number(due.remainingAmount || 0);
      if (amount <= 0) return { ...aiResult, executed: false, data: due, reply: 'This due is already paid.' };
      const paymentReq = { ...req, params: { id: due.id }, body: { paymentAmount: amount } };
      const updatedDue = await recordDuePayment(paymentReq);
      return { ...aiResult, executed: true, data: updatedDue, reply: `${updatedDue.farmerName} due has been cleared.` };
    }
    case 'RECORD_DUE_PAYMENT': {
      const due = await findOneDue(req, entities);
      const amount = safeNumber(entities.amount);
      if (!due) return { ...aiResult, executed: false, reply: 'Due record not found.' };
      if (!amount || amount <= 0) return { ...aiResult, executed: false, missingFields: ['amount'], reply: 'How much payment should I record?' };
      if (amount > Number(due.remainingAmount || 0)) return { ...aiResult, executed: false, reply: 'Payment cannot exceed remaining amount.' };
      const paymentReq = { ...req, params: { id: due.id }, body: { paymentAmount: amount } };
      const updatedDue = await recordDuePayment(paymentReq);
      return { ...aiResult, executed: true, data: updatedDue, reply: `Payment of ${amount} recorded for ${updatedDue.farmerName}.` };
    }
    case 'SEARCH_PRODUCT': {
      const filter = getOwnerFilter(req);
      if (entities.productName) filter.name = new RegExp(escapeRegex(entities.productName), 'i');
      const products = await Product.find(filter).sort({ name: 1 }).limit(10);
      return { ...aiResult, executed: true, data: products, reply: products.length ? `Found ${products.length} products.` : 'No products found.' };
    }
    case 'LOW_STOCK': {
      const products = await Product.find(getOwnerFilter(req)).sort({ stockQuantity: 1 }).limit(20);
      const low = products.filter((product) => Number(product.stockQuantity ?? product.currentStock ?? 0) <= Number(product.lowStockAlert ?? product.minimumStock ?? 0));
      return { ...aiResult, executed: true, data: low, reply: low.length ? `${low.length} products are low in stock.` : 'No low stock products found.' };
    }
    case 'TODAY_SALES': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const invoices = await Invoice.find(getOwnerFilter(req, { invoiceDate: { $gte: today, $lt: tomorrow } }));
      const total = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
      return { ...aiResult, executed: true, data: { total, invoices: invoices.length }, reply: `Today's sales are ${total.toFixed(2)} from ${invoices.length} invoices.` };
    }
    case 'SEARCH_FARMER': {
      const filter = getOwnerFilter(req);
      if (entities.farmerName) filter.name = new RegExp(escapeRegex(entities.farmerName), 'i');
      if (entities.phoneNumber) filter.mobileNumber = new RegExp(escapeRegex(String(entities.phoneNumber).replace(/\D/g, '')), 'i');
      const customers = await Customer.find(filter).sort({ name: 1 }).limit(10);
      return { ...aiResult, executed: true, data: customers, reply: customers.length ? `Found ${customers.length} farmers.` : 'No farmers found.' };
    }
    case 'NAVIGATE':
      return { ...aiResult, executed: true, data: { route: entities.route || '/dashboard' }, reply: aiResult.reply || 'Opening page.' };
    default:
      return { ...aiResult, executed: false, reply: aiResult.reply || 'I could not understand that request.' };
  }
};

export const handleAssistantRequest = async (req, res) => {
  try {
    const transcript = String(req.body.transcript || req.body.message || '').trim();
    if (!transcript) return validationError(res, 'Transcript is required');

    const aiResult = await callLlm({ transcript, conversation: req.body.conversation || [] });
    const result = await executeIntent(req, aiResult, Boolean(req.body.confirmed));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI assistant error:', error);
    res.status(500).json({ success: false, message: error.message || 'AI assistant failed' });
  }
};
