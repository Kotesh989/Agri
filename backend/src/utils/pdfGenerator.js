import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import QRCode from 'qrcode';

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const fetchRemoteImageBuffer = async (url) => {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch is not available to download custom QR image');
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download custom QR image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const buildUpiQrBuffer = async (settings) => {
  if (!settings) return null;

  if (settings.customUpiQrImageUrl && isValidHttpUrl(settings.customUpiQrImageUrl)) {
    try {
      return await fetchRemoteImageBuffer(settings.customUpiQrImageUrl);
    } catch (error) {
      console.warn('Unable to load custom UPI QR image:', error);
    }
  }

  if (!settings.upiId) return null;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.accountHolderName || '')}&cu=INR`;
  return QRCode.toBuffer(upiUrl, { type: 'png', errorCorrectionLevel: 'H', width: 256 });
};

export const generateInvoicePDF = async (invoice, items, customer, settings) => {
  const qrBuffer = await buildUpiQrBuffer(settings);
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      let buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(settings.shopName || 'Agri Fertilizer Shop', {
        align: 'center',
      });

      doc.fontSize(10).font('Helvetica').text(settings.shopAddress || 'Address', {
        align: 'center',
      });

      if (settings.shopPhone) {
        doc.text(`Phone: ${settings.shopPhone}`, { align: 'center' });
      }

      if (settings.gstNumber) {
        doc.text(`GST: ${settings.gstNumber}`, { align: 'center' });
      }

      doc.moveTo(50, 120).lineTo(550, 120).stroke();

      // Invoice Details
      doc.fontSize(14).font('Helvetica-Bold').text('INVOICE', 50, 130);

      const invoiceDetailsX = 50;
      const invoiceDetailsY = 160;
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, invoiceDetailsX, invoiceDetailsY);
      doc.text(`Date: ${invoice.invoiceDate.toLocaleDateString('en-IN')}`, invoiceDetailsX, invoiceDetailsY + 20);
      doc.text(`Due Date: ${invoice.dueDate?.toLocaleDateString('en-IN') || 'N/A'}`, invoiceDetailsX, invoiceDetailsY + 40);

      // Customer Details
      const customerX = 350;
      const customerY = 160;
      doc.font('Helvetica-Bold').text('Bill To:', customerX, customerY);
      doc.font('Helvetica').text(customer.name, customerX, customerY + 20);
      doc.text(`Mobile: ${customer.mobileNumber}`, customerX, customerY + 40);
      if (customer.address) {
        doc.text(`Address: ${customer.address}`, customerX, customerY + 60);
      }

      // Table Header
      const tableTop = 280;
      const itemIdX = 50;
      const itemNameX = 150;
      const quantityX = 300;
      const unitPriceX = 380;
      const gstX = 440;
      const totalX = 500;

      doc.font('Helvetica-Bold');
      doc.text('S.No', itemIdX, tableTop);
      doc.text('Product', itemNameX, tableTop);
      doc.text('Qty', quantityX, tableTop);
      doc.text('Price', unitPriceX, tableTop);
      doc.text('GST%', gstX, tableTop);
      doc.text('Total', totalX, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table Items
      doc.font('Helvetica');
      let yPosition = tableTop + 30;
      items.forEach((item, index) => {
        doc.text(`${index + 1}`, itemIdX, yPosition);
        doc.text(item.product.name.substring(0, 20), itemNameX, yPosition);
        doc.text(item.quantity.toString(), quantityX, yPosition);
        doc.text(`₹${item.unitPrice.toFixed(2)}`, unitPriceX, yPosition);
        doc.text(`${item.gstPercentage}%`, gstX, yPosition);
        doc.text(`₹${item.lineTotal.toFixed(2)}`, totalX, yPosition);
        yPosition += 20;
      });

      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

      // Summary
      yPosition += 10;
      const summaryX = 400;

      doc.font('Helvetica');
      doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, summaryX, yPosition);
      doc.text(`GST: ₹${invoice.gstAmount.toFixed(2)}`, summaryX, yPosition + 20);

      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`Total: ₹${invoice.totalAmount.toFixed(2)}`, summaryX, yPosition + 40);

      doc.font('Helvetica').fontSize(10);
      doc.text(`Paid: ₹${invoice.paidAmount.toFixed(2)}`, summaryX, yPosition + 60);
      doc.text(`Due: ₹${(invoice.totalAmount - invoice.paidAmount).toFixed(2)}`, summaryX, yPosition + 80);

      let termsBaseY = yPosition + 100;

      if (qrBuffer) {
        const qrX = 50;
        const qrY = yPosition + 100;
        try {
          doc.image(qrBuffer, qrX, qrY, { width: 130 });
          doc.font('Helvetica-Bold').fontSize(12).text('Scan to Pay', qrX, qrY + 140, { width: 130, align: 'center' });
          doc.font('Helvetica').fontSize(9).text(settings.upiId || '', qrX, qrY + 160, { width: 130, align: 'center' });
          doc.text(settings.accountHolderName || '', qrX, qrY + 175, { width: 130, align: 'center' });
          doc.text(settings.bankName || '', qrX, qrY + 190, { width: 130, align: 'center' });
          termsBaseY = qrY + 210;
        } catch (imageError) {
          console.warn('Unable to draw QR image on PDF:', imageError);
        }
      }

      doc.moveTo(50, termsBaseY).lineTo(550, termsBaseY).stroke();
      doc.fontSize(9).text('Terms & Conditions:', 50, termsBaseY + 20);
      doc.fontSize(8).text('Thank you for your business!', 50, termsBaseY + 40);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
