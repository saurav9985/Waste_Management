const mongoose = require('mongoose');
const Bin = require('../models/Bin');
const Driver = require('../models/Driver');
const RouteAssignment = require('../models/RouteAssignment');
const Complaint = require('../models/Complaint');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

exports.dashboard = async (req, res) => {
  const driver = await Driver.findById(req.session.user.id).lean();
  const routeDate = startOfToday();
  const assignment = await RouteAssignment.findOne({
    driver: req.session.user.id,
    routeDate,
  })
    .sort({ createdAt: -1 })
    .lean();
  let routeBins = [];
  if (assignment?.orderedBinIds?.length) {
    routeBins = await Bin.find({ _id: { $in: assignment.orderedBinIds } }).lean();
    const orderMap = new Map(assignment.orderedBinIds.map((id, i) => [id.toString(), i]));
    routeBins.sort((a, b) => (orderMap.get(a._id.toString()) ?? 0) - (orderMap.get(b._id.toString()) ?? 0));
  }
  const history = await RouteAssignment.find({ driver: req.session.user.id, status: 'completed' })
    .sort({ routeDate: -1 })
    .limit(10)
    .lean();
  const myComplaints = await Complaint.find({
    assignedDriver: req.session.user.id,
    status: { $in: ['pending', 'in-progress'] },
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(10)
    .populate('citizen', 'name phone')
    .lean();
  res.render('driver/dashboard', {
    title: 'Driver dashboard',
    driver,
    assignment,
    routeBins,
    history,
    myComplaints,
  });
};

exports.routeMapPage = async (req, res) => {
  const routeDate = startOfToday();
  const assignment = await RouteAssignment.findOne({
    driver: req.session.user.id,
    routeDate,
  }).lean();
  let bins = [];
  if (assignment?.orderedBinIds?.length) {
    bins = await Bin.find({ _id: { $in: assignment.orderedBinIds } }).lean();
    const orderMap = new Map(assignment.orderedBinIds.map((id, i) => [id.toString(), i]));
    bins.sort((a, b) => (orderMap.get(a._id.toString()) ?? 0) - (orderMap.get(b._id.toString()) ?? 0));
  }
  const depot = {
    lat: parseFloat(process.env.DEPOT_LAT) || 28.6139,
    lng: parseFloat(process.env.DEPOT_LNG) || 77.209,
    address: process.env.DEPOT_ADDRESS || 'Depot',
  };
  res.render('driver/route-map', {
    title: "Today's route",
    bins,
    assignment,
    depot,
  });
};

exports.toggleAvailability = async (req, res) => {
  const driver = await Driver.findById(req.session.user.id);
  if (!driver) {
    req.flash('error', 'Driver not found.');
    return res.redirect('/driver/dashboard');
  }
  driver.isAvailable = !driver.isAvailable;
  await driver.save();
  req.flash('success', driver.isAvailable ? 'You are marked available.' : 'You are marked unavailable.');
  res.redirect('/driver/dashboard');
};

exports.markCollected = async (req, res) => {
  const { binId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(binId)) {
    req.flash('error', 'Invalid bin.');
    return res.redirect('/driver/route-map');
  }
  await Bin.findByIdAndUpdate(binId, {
    fillLevel: 0,
    lastEmptied: new Date(),
    assignedDriver: req.session.user.id,
  });
  req.flash('success', 'Bin marked collected — great work.');
  res.redirect('/driver/route-map');
};

exports.updateLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (Number.isNaN(la) || Number.isNaN(ln)) {
    req.flash('error', 'Valid latitude and longitude are required.');
    return res.redirect('/driver/dashboard');
  }
  await Driver.findByIdAndUpdate(req.session.user.id, {
    currentLocation: { lat: la, lng: ln, updatedAt: new Date() },
  });
  req.flash('success', 'Location updated.');
  res.redirect('/driver/dashboard');
};
