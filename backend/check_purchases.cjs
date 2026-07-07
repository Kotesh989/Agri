const mongoose = require('mongoose');
const { Invoice, CustomerPurchasedItem } = require('./src/models/index.js');

(async () => {
  await mongoose.connect('mongodb+srv://kotesh:Kotesh%402004@chatgpt-clone.9bdcguy.mongodb.net/agri_fertilizer?retryWrites=true&w=majority&appName=chatgpt-clone');
  
  const invoices = await Invoice.find().select('invoiceNumber totalAmount balanceDue items createdAt');
  console.log('--- Real Invoices ---');
  invoices.forEach(inv => {
    console.log(JSON.stringify({
      id: inv._id,
      number: inv.invoiceNumber,
      amount: inv.totalAmount,
      due: inv.balanceDue,
      created: inv.createdAt
    }));
  });

  const manual = await CustomerPurchasedItem.find().select('productName totalAmount purchaseDate createdAt');
  console.log('--- Manual Purchased Items ---');
  manual.forEach(m => {
    console.log(JSON.stringify({
      id: m._id,
      product: m.productName,
      amount: m.totalAmount,
      date: m.purchaseDate,
      created: m.createdAt
    }));
  });

  await mongoose.disconnect();
  process.exit(0);
})().catch(console.error);
