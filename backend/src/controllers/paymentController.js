import { Customer, Invoice, Payment } from '../models/index.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId, ownedDocument } from '../utils/ownership.js';

export const recordPayment = async (req, res) => {
  try {
    const { invoiceId, customerId, amount, paymentMethod, referenceNumber, notes } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({ success: false, message: 'Customer and amount are required' });
    }

    const customer = await ownedDocument(Customer, req, customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const invoice = invoiceId ? await ownedDocument(Invoice, req, invoiceId) : null;
    if (invoiceId && !invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    if (invoice) {
      const outstanding = Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0);
      if (outstanding <= 0) {
        return res.status(400).json({ success: false, message: 'Invoice is already fully paid' });
      }
      if (paymentAmount > outstanding) {
        return res.status(400).json({ success: false, message: 'Payment exceeds remaining invoice balance' });
      }
    }

    const payment = await Payment.create({ adminId: getRequestAdminId(req), storeId: getRequestStoreId(req), invoiceId, customerId, amount: paymentAmount, paymentMethod, referenceNumber, notes });

    customer.totalCredit = Number(customer.totalCredit || 0) - paymentAmount;
    await customer.save();

    if (invoice) {
      invoice.paidAmount = Number(invoice.paidAmount || 0) + paymentAmount;
      invoice.balanceDue = Number((Number(invoice.totalAmount || 0) - invoice.paidAmount).toFixed(2));
      invoice.status = invoice.paidAmount >= invoice.totalAmount ? 'PAID' : 'PARTIAL';
      await invoice.save();
    }

    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: payment });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const listPayments = async (req, res) => {
  try {
    const { customerId, invoiceId, startDate, endDate } = req.query;
    const filter = getOwnerFilter(req);
    if (customerId) filter.customerId = customerId;
    if (invoiceId) filter.invoiceId = invoiceId;
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter).populate('customer').populate('invoice').sort({ paymentDate: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getCustomerCredit = async (req, res) => {
  try {
    const customer = await ownedDocument(Customer, req, req.params.customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const [invoices, payments] = await Promise.all([
      Invoice.find(getOwnerFilter(req, { customerId: customer._id })),
      Payment.find(getOwnerFilter(req, { customerId: customer._id })),
    ]);

    const totalDue = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

    res.json({
      success: true,
      data: {
        customerId: customer.id,
        customerName: customer.name,
        creditLimit: customer.creditLimit,
        totalCredit: customer.totalCredit,
        currentCreditUsed: Number(customer.totalCredit || 0),
        remainingCredit: Math.max(Number(customer.creditLimit || 0) - Number(customer.totalCredit || 0), 0),
        creditStatus: Number(customer.totalCredit || 0) >= Number(customer.creditLimit || 0) && Number(customer.creditLimit || 0) > 0 ? 'BLOCKED' : 'AVAILABLE',
        totalDue,
        payments,
        invoicesPending: invoices.filter((inv) => inv.status === 'PENDING' || inv.status === 'PARTIAL').length,
      },
    });
  } catch (error) {
    console.error('Get customer credit error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
