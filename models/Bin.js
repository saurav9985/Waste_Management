const mongoose = require('mongoose');

function deriveStatusFromFill(fillLevel) {
  if (fillLevel <= 0) return 'empty';
  if (fillLevel < 20) return 'empty';
  if (fillLevel < 80) return 'filling';
  if (fillLevel < 100) return 'full';
  return 'overflow';
}

const binSchema = new mongoose.Schema({
  binId: { type: String, required: true, unique: true },
  location: {
    address: String,
    ward: String,
    zone: String,
    lat: Number,
    lng: Number,
  },
  fillLevel: { type: Number, default: 0, min: 0, max: 100 },
  wasteType: { type: String, enum: ['wet', 'dry', 'mixed'], default: 'mixed' },
  status: { type: String, enum: ['empty', 'filling', 'full', 'overflow'], default: 'empty' },
  lastEmptied: { type: Date },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

binSchema.pre('save', function (next) {
  if (this.isModified('fillLevel')) {
    this.status = deriveStatusFromFill(this.fillLevel);
  }
  next();
});

module.exports = mongoose.model('Bin', binSchema);
