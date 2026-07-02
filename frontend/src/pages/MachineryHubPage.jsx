import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useNotificationContext } from '../components/Notification';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Calendar, ShieldCheck, Star, Clock, 
  MapPin, Camera, Info, ThumbsUp, Wrench 
} from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Modal } from '../components/Modal';

export const MachineryHubPage = () => {
  const { user } = useAuth();
  const { addNotification } = useNotificationContext();
  const [activeTab, setActiveTab] = useState('browse'); // browse, my-listings, my-bookings
  const [machinery, setMachinery] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Listing creation form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newListing, setNewListing] = useState({
    name: '',
    type: 'Tractor',
    rentalPricePerDay: '',
    description: '',
    location: '',
    image: '',
  });

  // Booking form modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookingDates, setBookingDates] = useState({
    startDate: '',
    endDate: '',
    notes: '',
  });

  // Review modal
  const [reviewBooking, setReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMachinery();
    fetchBookings();
  }, []);

  const fetchMachinery = async () => {
    try {
      setLoading(true);
      const res = await api.get('/machinery');
      setMachinery(res.data.data || []);
    } catch {
      addNotification('Error loading machinery listings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/machinery/bookings');
      setBookings(res.data.data || []);
    } catch {
      console.warn('Error loading bookings info');
    }
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewListing({ ...newListing, image: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/machinery', newListing);
      addNotification('Equipment listed successfully!', 'success');
      setShowAddModal(false);
      setNewListing({ name: '', type: 'Tractor', rentalPricePerDay: '', description: '', location: '', image: '' });
      fetchMachinery();
    } catch (err) {
      console.error(err);
      addNotification('Failed to create rental listing.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBooking = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setLoading(true);
      const payload = {
        machineryId: selectedItem.id || selectedItem._id,
        startDate: bookingDates.startDate,
        endDate: bookingDates.endDate,
        notes: bookingDates.notes,
      };
      await api.post('/machinery/bookings', payload);
      addNotification('Rental booking request submitted.', 'success');
      setSelectedItem(null);
      setBookingDates({ startDate: '', endDate: '', notes: '' });
      fetchBookings();
    } catch (err) {
      console.error(err);
      addNotification('Failed to submit booking request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId, status) => {
    try {
      await api.patch(`/machinery/bookings/${bookingId}/status`, { status });
      addNotification(`Booking successfully ${status.toLowerCase()}`, 'success');
      fetchBookings();
    } catch (err) {
      console.error(err);
      addNotification('Failed to update booking status.', 'error');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewBooking) return;
    try {
      await api.post(`/machinery/bookings/${reviewBooking.id || reviewBooking._id}/reviews`, {
        rating,
        comment,
      });
      addNotification('Review submitted successfully!', 'success');
      setReviewBooking(null);
      setRating(5);
      setComment('');
      fetchMachinery();
    } catch (err) {
      console.error(err);
      addNotification('Failed to save review.', 'error');
    }
  };

  // Filter listings
  const filteredListings = activeTab === 'my-listings' 
    ? machinery.filter((item) => String(item.ownerId?.id || item.ownerId?._id || item.ownerId) === String(user?.id))
    : machinery;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Navbar />
        <main className="app-main">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Wrench className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                Community Machinery Hub
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Rent heavy agricultural machinery or list your own equipment for extra income.
              </p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="btn btn-primary flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              List Equipment
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'browse'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Browse Marketplace
              </button>
              <button
                onClick={() => setActiveTab('my-listings')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'my-listings'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                My Listings
              </button>
              <button
                onClick={() => setActiveTab('my-bookings')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'my-bookings'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Booking Reports / history
              </button>
            </div>
          </div>

          {/* Browse & listings grid */}
          {activeTab !== 'my-bookings' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredListings.map((item) => (
                <div key={item.id || item._id} className="card flex flex-col justify-between overflow-hidden p-0 border border-slate-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                  {/* Photo Container */}
                  <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Wrench className="w-12 h-12 text-slate-300 dark:text-slate-700" strokeWidth={1} />
                    )}
                    <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow">
                      {item.type}
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-extrabold text-base text-slate-800 dark:text-gray-100">{item.name}</h3>
                        <div className="flex items-center text-xs gap-0.5 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{item.averageRating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {item.location || 'Local Area'}
                      </p>
                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Daily Rent</p>
                        <p className="text-lg font-black text-slate-800 dark:text-gray-100">
                          {formatCurrency(item.rentalPricePerDay)}
                        </p>
                      </div>
                      
                      {String(item.ownerId?.id || item.ownerId?._id || item.ownerId) !== String(user?.id) ? (
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="btn btn-primary btn-sm flex items-center gap-1"
                        >
                          <Calendar className="w-4 h-4" /> Book Rent
                        </button>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                          Your Listing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredListings.length === 0 && (
                <div className="col-span-full card p-12 text-center text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" strokeWidth={1} />
                  <p className="text-sm font-semibold">No machinery listed yet.</p>
                </div>
              )}
            </div>
          ) : (
            /* Bookings Panel */
            <div className="card overflow-x-auto">
              <h2 className="text-xl font-bold mb-4 font-semibold">Rental Booking requests & reports</h2>
              <table className="table min-w-[900px]">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Renter / Farmer</th>
                    <th>Rental Dates</th>
                    <th>Durn Price</th>
                    <th>Total Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((book) => {
                    const isOwner = String(book.machineryId?.ownerId?.id || book.machineryId?.ownerId?._id || book.machineryId?.ownerId) === String(user?.id);
                    const isPending = book.status === 'Pending';
                    const isApproved = book.status === 'Approved';

                    return (
                      <tr key={book.id || book._id}>
                        <td>
                          <div className="font-semibold">{book.machineryId?.name || 'Deleted Equipment'}</div>
                          <div className="text-[10px] text-gray-500">{book.machineryId?.type}</div>
                        </td>
                        <td>
                          <div className="font-semibold">{book.renterId?.name}</div>
                          <div className="text-[10px] text-gray-500">{book.renterId?.mobileNumber}</div>
                        </td>
                        <td>
                          <div className="text-xs">{formatDate(book.startDate)} - {formatDate(book.endDate)}</div>
                        </td>
                        <td>{formatCurrency(book.machineryId?.rentalPricePerDay || 0)} / day</td>
                        <td className="font-bold">{formatCurrency(book.totalAmount)}</td>
                        <td>
                          <span className={`badge ${
                            book.status === 'Approved' ? 'badge-green' : 
                            book.status === 'Pending' ? 'badge-yellow' : 
                            book.status === 'Completed' ? 'badge-blue' : 'badge-red'
                          }`}>
                            {book.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1.5">
                            {isOwner && isPending && (
                              <>
                                <button 
                                  onClick={() => handleStatusChange(book.id || book._id, 'Approved')}
                                  className="btn btn-primary btn-xs"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(book.id || book._id, 'Rejected')}
                                  className="btn btn-danger btn-xs"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {isOwner && isApproved && (
                              <button 
                                onClick={() => handleStatusChange(book.id || book._id, 'Completed')}
                                className="btn btn-secondary btn-xs text-emerald-600 hover:text-emerald-700"
                              >
                                Mark Completed
                              </button>
                            )}

                            {!isOwner && book.status === 'Completed' && (
                              <button 
                                onClick={() => setReviewBooking(book)}
                                className="btn btn-secondary btn-xs flex items-center gap-1 text-amber-500"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" /> Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-gray-500 py-8">
                        No bookings logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Listing Creation Modal */}
          <Modal isOpen={showAddModal} title="List Machinery for Rent" onClose={() => setShowAddModal(false)} size="lg">
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Equipment Name *</label>
                <input 
                  type="text" 
                  value={newListing.name}
                  onChange={(e) => setNewListing({ ...newListing, name: e.target.value })}
                  placeholder="e.g. John Deere Tractor 5050D"
                  className="input" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Machinery Type *</label>
                  <select 
                    value={newListing.type}
                    onChange={(e) => setNewListing({ ...newListing, type: e.target.value })}
                    className="input"
                  >
                    <option value="Tractor">Tractor</option>
                    <option value="Power tiller">Power tiller</option>
                    <option value="Rotavator">Rotavator</option>
                    <option value="Drone sprayer">Drone sprayer</option>
                    <option value="Seed drill">Seed drill</option>
                    <option value="Harvester">Harvester</option>
                    <option value="Water pump">Water pump</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Rent Cost per Day (₹) *</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newListing.rentalPricePerDay}
                    onChange={(e) => setNewListing({ ...newListing, rentalPricePerDay: e.target.value })}
                    placeholder="e.g. 1500"
                    className="input" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Location / Village *</label>
                  <input 
                    type="text" 
                    value={newListing.location}
                    onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                    placeholder="e.g. Mandya"
                    className="input" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Upload Photo</label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary flex-1 justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" /> Pick File
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageCapture}
                      accept="image/*"
                      className="hidden" 
                    />
                  </div>
                </div>
              </div>

              {newListing.image && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                  <img src={newListing.image} alt="Pre-view" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">Description / Condition notes</label>
                <textarea 
                  value={newListing.description}
                  onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                  placeholder="Describe horse power, attachments included, or specific rental terms..."
                  className="input min-h-[80px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn btn-primary flex-1 justify-center">Save Listing</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </Modal>

          {/* Booking Request Modal */}
          {selectedItem && (
            <Modal isOpen={Boolean(selectedItem)} title={`Book ${selectedItem.name}`} onClose={() => setSelectedItem(null)} size="md">
              <form onSubmit={handleRequestBooking} className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between"><span>Equipment:</span><span className="font-semibold">{selectedItem.name}</span></div>
                  <div className="flex justify-between"><span>Daily Rent:</span><span className="font-semibold">{formatCurrency(selectedItem.rentalPricePerDay)}</span></div>
                  <div className="flex justify-between"><span>Location:</span><span className="font-semibold">{selectedItem.location}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Start Date *</label>
                    <input 
                      type="date" 
                      value={bookingDates.startDate}
                      onChange={(e) => setBookingDates({ ...bookingDates, startDate: e.target.value })}
                      className="input" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">End Date *</label>
                    <input 
                      type="date" 
                      value={bookingDates.endDate}
                      onChange={(e) => setBookingDates({ ...bookingDates, endDate: e.target.value })}
                      className="input" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Notes for owner</label>
                  <textarea 
                    value={bookingDates.notes}
                    onChange={(e) => setBookingDates({ ...bookingDates, notes: e.target.value })}
                    placeholder="Specify target crop, custom request time, or drop-off location..."
                    className="input min-h-[60px]"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1 justify-center">Request Rental</button>
                  <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-secondary flex-1 justify-center">Cancel</button>
                </div>
              </form>
            </Modal>
          )}

          {/* Review Modal */}
          {reviewBooking && (
            <Modal isOpen={Boolean(reviewBooking)} title="Submit Rental Feedback" onClose={() => setReviewBooking(null)} size="md">
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Give Rating (1 to 5 Stars)</label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Review Comment</label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a brief comment about equipment condition, operation ease, or owner communication..."
                    className="input min-h-[80px]"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1 justify-center">Submit Feedback</button>
                  <button type="button" onClick={() => setReviewBooking(null)} className="btn btn-secondary flex-1 justify-center">Cancel</button>
                </div>
              </form>
            </Modal>
          )}
        </main>
      </div>
    </div>
  );
};
