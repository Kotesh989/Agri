import { Machinery, MachineryBooking } from '../models/index.js';
import { validationError } from '../utils/http.js';

export const listMachinery = async (req, res) => {
  try {
    const { type, location } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (location) filter.location = new RegExp(String(location).trim(), 'i');

    const list = await Machinery.find(filter)
      .populate('ownerId', 'name email mobileNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('List machinery error:', error);
    res.status(500).json({ success: false, message: 'Failed to list machinery.' });
  }
};

export const createMachinery = async (req, res) => {
  try {
    const { name, type, rentalPricePerDay, description, image, location, availability } = req.body;

    if (!name || !type || rentalPricePerDay === undefined) {
      return validationError(res, 'Name, type, and price per day are required.');
    }

    const item = await Machinery.create({
      ownerId: req.user.userId,
      name,
      type,
      rentalPricePerDay: Number(rentalPricePerDay),
      description,
      image,
      location,
      availability: availability || [],
    });

    res.status(201).json({ success: true, message: 'Machinery listed successfully', data: item });
  } catch (error) {
    console.error('Create machinery error:', error);
    res.status(500).json({ success: false, message: 'Failed to create machinery listing.' });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { machineryId, startDate, endDate, notes } = req.body;

    if (!machineryId || !startDate || !endDate) {
      return validationError(res, 'Machinery selection, start date, and end date are required.');
    }

    const machinery = await Machinery.findById(machineryId);
    if (!machinery) {
      return res.status(404).json({ success: false, message: 'Machinery not found.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    const totalAmount = days * machinery.rentalPricePerDay;

    const booking = await MachineryBooking.create({
      machineryId,
      renterId: req.user.userId,
      startDate: start,
      endDate: end,
      totalAmount,
      status: 'Pending',
      notes,
    });

    res.status(201).json({ success: true, message: 'Booking requested successfully', data: booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to book machinery.' });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Approved, Rejected, Completed

    if (!['Approved', 'Rejected', 'Completed'].includes(status)) {
      return validationError(res, 'Invalid booking status.');
    }

    const booking = await MachineryBooking.findById(id).populate('machineryId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Check if user is owner of the machinery or admin
    if (String(booking.machineryId.ownerId) !== String(req.user.userId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this booking.' });
    }

    booking.status = status;
    await booking.save();

    res.json({ success: true, message: `Booking status updated to ${status}.`, data: booking });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking.' });
  }
};

export const listBookings = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'FARMER') {
      // Farmer sees their own bookings
      filter.renterId = req.user.userId;
    } else if (req.user.role === 'ADMIN') {
      // Admin sees everything
    }

    const bookings = await MachineryBooking.find(filter)
      .populate({
        path: 'machineryId',
        populate: { path: 'ownerId', select: 'name email mobileNumber' }
      })
      .populate('renterId', 'name email mobileNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('List bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load bookings.' });
  }
};

export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return validationError(res, 'Rating must be between 1 and 5.');
    }

    const booking = await MachineryBooking.findById(id).populate('machineryId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (String(booking.renterId) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: 'Only the renter can review this booking.' });
    }

    const machinery = await Machinery.findById(booking.machineryId.id);
    machinery.ratings.push({
      renterId: req.user.userId,
      rating: Number(rating),
      comment,
      createdAt: new Date(),
    });

    const sum = machinery.ratings.reduce((s, r) => s + r.rating, 0);
    machinery.averageRating = Number((sum / machinery.ratings.length).toFixed(1));
    await machinery.save();

    res.json({ success: true, message: 'Review added successfully.', data: machinery });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};
