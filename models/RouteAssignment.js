const mongoose = require('mongoose');

const routeAssignmentSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  routeDate: { type: Date, required: true },
  binIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bin' }],
  orderedBinIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bin' }],
  depot: {
    lat: Number,
    lng: Number,
    address: String,
  },
  encodedPolyline: { type: String },
  legsSummary: { type: String },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed'],
    default: 'assigned',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
});

routeAssignmentSchema.index({ driver: 1, routeDate: 1 });

module.exports = mongoose.model('RouteAssignment', routeAssignmentSchema);
