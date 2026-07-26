const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, unique: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['overflow', 'missed-pickup', 'smell', 'illegal-dumping', 'damaged-bin', 'other'],
    default: 'other',
  },
  location: {
    address: String,
    ward: String,
    lat: Number,
    lng: Number,
  },
  images: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
    default: 'pending',
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  adminRemarks: { type: String },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  citizenUnread: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

complaintSchema.pre('validate', async function () {
  if (!this.complaintId) {
    const Counter = require('./Counter');
    const year = new Date().getFullYear();
    const seq = await Counter.getNextSequence('complaint', year);
    this.complaintId = `CMP-${year}-${String(seq).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);
