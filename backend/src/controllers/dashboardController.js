import { Customer, CustomerPurchasedItem, Invoice, Product, Purchase } from '../models/index.js';
import { getOwnerFilter, getOwnerMatch } from '../utils/ownership.js';

const escapeRegex = (value) => String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchesSearch = (values, search) => {
  if (!search) return true;
  const term = String(search).toLowerCase();
  return values.some((value) => String(value || '').toLowerCase().includes(term));
};

const sumField = async (model, filter, field) => {
  const result = await model.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return result[0]?.total || 0;
};

export const getDashboardStats = async (req, res) => {
  try {
    const ownerFilter = getOwnerFilter(req);
    const ownerMatch = getOwnerMatch(req);
    const totalProducts = await Product.countDocuments(ownerFilter);
    const products = await Product.find(ownerFilter);
    const lowStockProducts = products.filter(
      (product) => Number(product.stockQuantity ?? product.currentStock ?? 0) <= Number(product.lowStockAlert ?? product.minimumStock ?? 0)
    );
    const totalCustomers = await Customer.countDocuments(ownerFilter);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [todaySales, monthlySales, pendingInvoices, totalDue, expiringProducts, creditPendingCustomers, fertilizerSales, pesticideSales, recentPurchases, invoices] = await Promise.all([
      sumField(Invoice, { ...ownerMatch, invoiceDate: { $gte: today, $lt: tomorrow } }, 'totalAmount'),
      sumField(Invoice, { ...ownerMatch, invoiceDate: { $gte: monthStart } }, 'totalAmount'),
      Invoice.countDocuments({ ...ownerFilter, status: { $in: ['PENDING', 'PARTIAL'] } }),
      sumField(Invoice, { ...ownerMatch, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, 'totalAmount'),
      Product.countDocuments({ ...ownerFilter, expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() } }),
      Customer.countDocuments({ ...ownerFilter, totalCredit: { $gt: 0 } }),
      CustomerPurchasedItem.countDocuments({ ...ownerFilter, category: 'FERTILIZER' }),
      CustomerPurchasedItem.countDocuments({ ...ownerFilter, category: 'PESTICIDE' }),
      Purchase.find(ownerFilter).populate('supplier').sort({ purchaseDate: -1 }).limit(5),
      Invoice.find(ownerFilter).populate('items.product').sort({ invoiceDate: 1 }),
    ]);

    const salesByMonthMap = {};
    const topProductsMap = {};
    const paymentStatusMap = { PAID: 0, PARTIAL: 0, PENDING: 0, OVERDUE: 0 };
    let totalProfit = 0;

    invoices.forEach((invoice) => {
      const month = invoice.invoiceDate?.toISOString().slice(0, 7) || 'Unknown';
      salesByMonthMap[month] = (salesByMonthMap[month] || 0) + Number(invoice.totalAmount || 0);
      paymentStatusMap[invoice.status] = (paymentStatusMap[invoice.status] || 0) + 1;
      invoice.items.forEach((item) => {
        const productName = item.product?.name || 'Unknown product';
        topProductsMap[productName] = (topProductsMap[productName] || 0) + Number(item.quantity || 0);
        totalProfit += (Number(item.unitPrice || 0) - Number(item.product?.purchasePrice || 0)) * Number(item.quantity || 0);
      });
    });

    const salesByMonth = Object.entries(salesByMonthMap).map(([month, total]) => ({ month, total }));
    const topSellingProducts = Object.entries(topProductsMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    const stockLevelChart = products.slice(0, 8).map((product) => ({
      name: product.name,
      stock: Number(product.stockQuantity ?? product.currentStock ?? 0),
      minimumStock: Number(product.lowStockAlert ?? product.minimumStock ?? 0),
    }));

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts: lowStockProducts.length,
        totalCustomers,
        todaySales,
        monthlySales,
        pendingInvoices,
        totalDue,
        expiringProducts,
        totalProfit,
        totalInventory: products.reduce((sum, product) => sum + Number(product.stockQuantity ?? product.currentStock ?? 0), 0),
        creditPendingCustomers,
        fertilizerSales,
        pesticideSales,
        recentPurchases,
        salesByMonth,
        topSellingProducts,
        paymentStatusChart: Object.entries(paymentStatusMap).map(([status, count]) => ({ status, count })),
        stockLevelChart,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy, search } = req.query;
    const filter = getOwnerFilter(req);
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [{ invoiceNumber: new RegExp(escapeRegex(search), 'i') }];
    }

    const invoices = await Invoice.find(filter).populate('customer').populate('items.product').sort({ invoiceDate: -1 });
    let report = invoices;

    if (groupBy === 'daily' || groupBy === 'monthly') {
      const grouped = {};
      invoices.forEach((invoice) => {
        const key = groupBy === 'daily'
          ? invoice.invoiceDate.toISOString().split('T')[0]
          : invoice.invoiceDate.toISOString().slice(0, 7);
        grouped[key] ||= groupBy === 'daily'
          ? { date: key, totalInvoices: 0, totalAmount: 0, totalItems: 0 }
          : { month: key, totalInvoices: 0, totalAmount: 0, totalItems: 0 };
        grouped[key].totalInvoices += 1;
        grouped[key].totalAmount += invoice.totalAmount;
        grouped[key].totalItems += invoice.totalQuantity;
      });
      report = Object.values(grouped);
    } else {
      report = invoices
        .map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer?.name || invoice.customerSnapshot?.name || 'Walk-in customer',
          farmerName: invoice.customer?.name || invoice.customerSnapshot?.name || 'Walk-in customer',
          mobileNumber: invoice.customer?.mobileNumber || invoice.customerSnapshot?.mobileNumber || '',
          village: invoice.customer?.village || invoice.customerSnapshot?.village || '',
          date: invoice.invoiceDate,
          totalAmount: Number(invoice.totalAmount || 0),
          paidAmount: Number(invoice.paidAmount || 0),
          balanceDue: Number(invoice.balanceDue ?? (Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0))),
          paymentStatus: invoice.status,
        }))
        .filter((row) => matchesSearch([row.invoiceNumber, row.customerName, row.mobileNumber, row.village, row.paymentStatus], search));
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;
    const filter = getOwnerFilter(req);
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter).populate('items.product');
    let totalRevenue = 0;
    let totalCost = 0;
    const productMap = {};

    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const quantity = Number(item.quantity || 0);
        const sellingPrice = Number(item.unitPrice || item.product?.sellingPrice || item.product?.pricePerUnit || 0);
        const purchasePrice = Number(item.product?.purchasePrice || 0);
        const revenue = sellingPrice * quantity;
        const cost = purchasePrice * quantity;
        const productName = item.product?.name || 'Unknown product';

        totalRevenue += revenue + Number(item.gstAmount || 0);
        totalCost += cost;

        productMap[productName] ||= {
          productName,
          quantitySold: 0,
          purchasePrice,
          sellingPrice,
          revenue: 0,
          cost: 0,
          profitAmount: 0,
          profitPercentage: 0,
        };
        productMap[productName].quantitySold += quantity;
        productMap[productName].revenue += revenue;
        productMap[productName].cost += cost;
        productMap[productName].profitAmount += revenue - cost;
      });
    });

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0;
    const rows = Object.values(productMap)
      .map((row) => ({
        ...row,
        profitAmount: Number(row.profitAmount.toFixed(2)),
        profitPercentage: row.revenue > 0 ? Number(((row.profitAmount / row.revenue) * 100).toFixed(2)) : 0,
      }))
      .filter((row) => matchesSearch([row.productName], search))
      .sort((a, b) => b.profitAmount - a.profitAmount);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        profit: profit.toFixed(2),
        profitMargin: `${profitMargin}%`,
        rows,
      },
    });
  } catch (error) {
    console.error('Get profit report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPurchasesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy, search } = req.query;
    const filter = getOwnerFilter(req);
    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(filter).populate('supplier').populate('items.product').sort({ purchaseDate: -1 });
    let report = purchases;

    if (groupBy === 'daily' || groupBy === 'monthly') {
      const grouped = {};
      purchases.forEach((purchase) => {
        const key = groupBy === 'daily'
          ? purchase.purchaseDate.toISOString().split('T')[0]
          : purchase.purchaseDate.toISOString().slice(0, 7);
        grouped[key] ||= groupBy === 'daily'
          ? { date: key, totalPurchases: 0, totalAmount: 0, totalItems: 0 }
          : { month: key, totalPurchases: 0, totalAmount: 0, totalItems: 0 };
        grouped[key].totalPurchases += 1;
        grouped[key].totalAmount += Number(purchase.totalAmount || 0);
        grouped[key].totalItems += purchase.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      });
      report = Object.values(grouped);
    } else {
      report = purchases
        .flatMap((purchase) =>
          purchase.items.map((item) => ({
            id: `${purchase.id}-${item.id}`,
            purchaseNumber: purchase.purchaseNumber,
            supplierName: purchase.supplier?.name || 'Unknown supplier',
            productName: item.product?.name || 'Unknown product',
            quantityPurchased: Number(item.quantity || 0),
            purchaseDate: purchase.purchaseDate,
            batchNumber: item.batchNumber || item.product?.batchNumber || '-',
            expiryDate: item.expiryDate || item.product?.expiryDate || null,
            totalCost: Number(item.totalPrice || 0),
            status: purchase.status,
          }))
        )
        .filter((row) => matchesSearch([row.purchaseNumber, row.supplierName, row.productName, row.batchNumber, row.status], search));
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Get purchases report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getGstReport = async (req, res) => {
  try {
    const { startDate, endDate, search } = req.query;
    const filter = getOwnerFilter(req);
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter).populate('items.product');
    const rows = invoices
      .flatMap((invoice) =>
        invoice.items.map((item) => {
          const gstRate = Number(item.gstPercentage || item.product?.gstRate || item.product?.gstPercentage || 0);
          const taxableAmount = Number(item.totalPrice || 0);
          const totalGst = Number(item.gstAmount || 0);
          return {
            id: `${invoice.id}-${item.id}`,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            productName: item.product?.name || 'Unknown product',
            gstRate,
            taxableAmount,
            cgst: totalGst / 2,
            sgst: totalGst / 2,
            totalGst,
            grandTotal: taxableAmount + totalGst,
          };
        })
      )
      .filter((row) => matchesSearch([row.invoiceNumber, row.productName, row.gstRate], search));

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get GST report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getStockReport = async (req, res) => {
  try {
    const { expiryDays = 30, search } = req.query;
    const filter = getOwnerFilter(req);
    const products = await Product.find(filter).populate('supplierId').sort({ name: 1 });
    const now = new Date();
    const expiryCutoff = new Date(now);
    expiryCutoff.setDate(expiryCutoff.getDate() + Number(expiryDays));

    const stockReport = products.map((product) => {
      const quantity = Number(product.stockQuantity ?? product.currentStock ?? 0);
      const threshold = Number(product.lowStockAlert ?? product.minimumStock ?? 0);
      const expiringSoon = product.expiryDate && product.expiryDate <= expiryCutoff && product.expiryDate >= now;
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        supplier: product.supplierId?.name || null,
        quantity,
        unitType: product.unitType || product.unit,
        gstRate: Number(product.gstRate || product.gstPercentage || 0),
        minimumStock: threshold,
        lowStock: quantity <= threshold,
        expiryDate: product.expiryDate,
        expiringSoon,
        expiryWarning: expiringSoon ? `Expires within ${expiryDays} days` : product.expiryDate && product.expiryDate < now ? 'Expired' : 'OK',
        batchNumber: product.batchNumber,
      };
    }).filter((row) => matchesSearch([row.name, row.category, row.supplier, row.batchNumber, row.expiryWarning], search));

    res.json({ success: true, data: stockReport });
  } catch (error) {
    console.error('Get stock report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerOutstandingReport = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    const filter = getOwnerFilter(req);
    const customers = await Customer.find(filter).sort({ name: 1 });
    const report = await Promise.all(customers.map(async (customer) => {
      const invoiceFilter = { ...filter, customerId: customer._id };
      if (startDate || endDate) {
        invoiceFilter.invoiceDate = {};
        if (startDate) invoiceFilter.invoiceDate.$gte = new Date(startDate);
        if (endDate) invoiceFilter.invoiceDate.$lte = new Date(endDate);
      }
      const invoices = await Invoice.find(invoiceFilter);
      const outstanding = invoices.reduce((sum, invoice) => sum + (Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)), 0);
      const totalPurchaseAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
      const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
      return {
        customerId: customer.id,
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        village: customer.village || customer.city || '',
        gstNumber: customer.gstNumber,
        creditLimit: customer.creditLimit,
        totalCredit: Number(customer.totalCredit || 0),
        totalInvoices: invoices.length,
        totalPurchaseAmount: Number(totalPurchaseAmount.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
        balanceDue: Number(outstanding.toFixed(2)),
        invoicesPending: invoices.length,
      };
    }));

    res.json({
      success: true,
      data: report.filter((row) => matchesSearch([row.name, row.mobileNumber, row.village, row.gstNumber], search)),
    });
  } catch (error) {
    console.error('Get customer outstanding report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
