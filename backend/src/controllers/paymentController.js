import mongoose from 'mongoose';
import { Customer, Invoice, Payment } from '../models/index.js';
import { getOwnerFilter, getRequestAdminId, getRequestStoreId, ownedDocument } from '../utils/ownership.js';

export const recordPayment = async (req, res) => {
  try {
    const {
      invoiceId,
      customerId,
      farmerId,
      amount,
      amountPaid,
      paidAmount,
      paymentMethod,
      referenceNumber,
      notes,
      note,
    } = req.body;

    const normalizedInvoiceId = String(invoiceId || '').trim();
    if (!normalizedInvoiceId) {
      return res.status(400).json({ success: false, message: 'Invoice ID is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(normalizedInvoiceId)) {
      return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
    }

    const invoice = await ownedDocument(Invoice, req, normalizedInvoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (customerId && !mongoose.Types.ObjectId.isValid(String(customerId))) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }
    if (farmerId && !mongoose.Types.ObjectId.isValid(String(farmerId))) {
      return res.status(400).json({ success: false, message: 'Invalid farmer ID' });
    }
    if (customerId && String(invoice.customerId) !== String(customerId)) {
      return res.status(400).json({ success: false, message: 'Customer does not match invoice' });
    }
    if (farmerId && invoice.farmerUserId && String(invoice.farmerUserId) !== String(farmerId)) {
      return res.status(400).json({ success: false, message: 'Farmer does not match invoice' });
    }

    const customer = await ownedDocument(Customer, req, invoice.customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const totalAmount = Number(invoice.totalAmount || 0);
    const currentPaid = Number(invoice.paidAmount ?? invoice.amountPaid ?? 0);
    const outstanding = Number((Number(invoice.balanceDue ?? invoice.dueAmount ?? (totalAmount - currentPaid))).toFixed(2));
    if (invoice.status === 'PAID' || invoice.paymentStatus === 'PAID' || outstanding <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice already paid' });
    }

    const requestedAmount = Number(amountPaid ?? paidAmount ?? amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }
    if (requestedAmount < outstanding) {
      return res.status(400).json({ success: false, message: 'Payment amount must clear the full due amount' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Payment method is required' });
    }

    const paidAt = new Date();
    const payment = await Payment.create({
      adminId: getRequestAdminId(req),
      storeId: getRequestStoreId(req),
      invoiceId: invoice._id,
      customerId: customer._id,
      amount: outstanding,
      paymentMethod,
      referenceNumber,
      notes: note || notes || `Cleared due for invoice ${invoice.invoiceNumber}`,
      paymentDate: paidAt,
    });

    customer.totalCredit = Math.max(Number(customer.totalCredit || 0) - outstanding, 0);
    await customer.save();

    invoice.amountPaid = totalAmount;
    invoice.paidAmount = totalAmount;
    invoice.balanceDue = 0;
    invoice.dueAmount = 0;
    invoice.paymentStatus = 'PAID';
    invoice.status = 'PAID';
    invoice.paymentMethod = paymentMethod;
    invoice.paidAt = paidAt;
    await invoice.save();

    const populatedPayment = await Payment.findById(payment._id).populate('customer').populate('invoice');
    res.status(201).json({ success: true, message: 'Invoice marked as paid successfully', data: populatedPayment });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
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
