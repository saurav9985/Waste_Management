const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  assignedZone: { type: String },
  licenseNumber: { type: String },
  role: { type: String, default: 'driver' },
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
});

driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
