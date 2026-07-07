const mongoose = require('mongoose');
const { Invoice, CustomerPurchasedItem } = require('./src/models/index.js');

(async () => {
  await mongoose.connect('mongodb+srv://kotesh:Kotesh%402004@chatgpt-clone.9bdcguy.mongodb.net/agri_fertilizer?retryWrites=true&w=majority&appName=chatgpt-clone');
  
  const manual = await CustomerPurchasedItem.find({ invoiceId: { $exists: false } });
  console.log(`Found ${manual.length} unlinked manual items. Matching...`);

  let linkedCount = 0;
  for (const m of manual) {
    // Find matching invoice
    const match = await Invoice.findOne({
      customerId: m.customerId,
      createdAt: {
        $gte: new Date(m.createdAt.getTime() - 60000), // Within 1 minute
        $lte: new Date(m.createdAt.getTime() + 60000)
      },
      "items.productId": m.productId,
      "items.quantity": m.quantity
    });

    if (match) {
      m.invoiceId = match._id;
      await m.save();
      console.log(`Linked manual purchase ${m._id} ("${m.productName}") to Invoice ${match.invoiceNumber}`);
      linkedCount++;
    }
  }

  console.log(`Linking done! Total linked: ${linkedCount}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch(console.error);
