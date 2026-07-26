const { Client } = require('@googlemaps/google-maps-services-js');
const mongoose = require('mongoose');
const Bin = require('../models/Bin');
const Complaint = require('../models/Complaint');
const Driver = require('../models/Driver');
const RouteAssignment = require('../models/RouteAssignment');
const PAGE_SIZE = 10;
const HIGH_FILL = 70;
const MAX_WAYPOINTS = 25;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

exports.dashboard = async (req, res) => {
  const todayStart = startOfToday();
  const [
    totalBins,
    overflowBins,
    pendingComplaints,
    activeDrivers,
    collectionsToday,
    bins,
  ] = await Promise.all([
    Bin.countDocuments({ isActive: true }),
    Bin.countDocuments({ isActive: true, fillLevel: { $gte: 80 } }),
    Complaint.countDocuments({ status: 'pending' }),
    Driver.countDocuments({ isAvailable: true }),
    Bin.countDocuments({ isActive: true, lastEmptied: { $gte: todayStart } }),
    Bin.find({ isActive: true, fillLevel: { $gte: 80 } })
      .sort({ fillLevel: -1 })
      .limit(8)
      .lean(),
  ]);
  const startMonth = new Date();
  startMonth.setDate(1);
  startMonth.setHours(0, 0, 0, 0);
  const [resolvedMonth, filedMonth] = await Promise.all([
    Complaint.countDocuments({ status: 'resolved', resolvedAt: { $gte: startMonth } }),
    Complaint.countDocuments({ createdAt: { $gte: startMonth } }),
  ]);
  const resolvedPct =
    filedMonth === 0 ? 100 : Math.round((resolvedMonth / filedMonth) * 100);
  res.render('admin/dashboard', {
    title: 'Operations overview',
    stats: {
      totalBins,
      overflowBins,
      pendingComplaints,
      activeDrivers,
      collectionsToday,
      resolvedPct,
      resolvedMonth,
      filedMonth,
    },
    alertBins: bins,
  });
};

exports.binsPage = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { ward, zone, status } = req.query;
  const filter = { isActive: true };
  if (ward) filter['location.ward'] = new RegExp(`^${escapeRegex(ward)}$`, 'i');
  if (zone) filter['location.zone'] = new RegExp(`^${escapeRegex(zone)}$`, 'i');
  if (status) filter.status = status;
  const [bins, total] = await Promise.all([
    Bin.find(filter)
      .populate('assignedDriver', 'name vehicleNumber')
      .sort({ fillLevel: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Bin.countDocuments(filter),
  ]);
  const wards = await Bin.distinct('location.ward', { isActive: true });
  const zones = await Bin.distinct('location.zone', { isActive: true });
  res.render('admin/bins', {
    title: 'Bins',
    bins,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    total,
    filters: { ward, zone, status },
    wards: wards.filter(Boolean),
    zones: zones.filter(Boolean),
  });
};

exports.triggerCollection = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Invalid bin.');
    return res.redirect('/admin/bins');
  }
  await Bin.findByIdAndUpdate(id, {
    fillLevel: 0,
    lastEmptied: new Date(),
  });
  req.flash('success', 'Collection recorded — bin is empty again.');
  res.redirect('/admin/bins');
};

exports.routesPage = async (req, res) => {
  const bins = await Bin.find({
    isActive: true,
    fillLevel: { $gte: HIGH_FILL },
    'location.lat': { $exists: true, $ne: null },
    'location.lng': { $exists: true, $ne: null },
  })
    .sort({ fillLevel: -1 })
    .lean();
  const drivers = await Driver.find({}).sort({ name: 1 }).lean();
  const depot = {
    lat: parseFloat(process.env.DEPOT_LAT) || 28.6139,
    lng: parseFloat(process.env.DEPOT_LNG) || 77.209,
    address: process.env.DEPOT_ADDRESS || 'Depot',
  };
  res.render('admin/routes', {
    title: 'Route optimization',
    bins,
    drivers,
    highFill: HIGH_FILL,
    maxWaypoints: MAX_WAYPOINTS,
    depot,
  });
};

exports.generateRoute = async (req, res) => {
  const { binIds } = req.body;
  let ids = Array.isArray(binIds) ? binIds : binIds ? [binIds] : [];
  ids = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) {
    return res.status(400).json({ ok: false, message: 'Select at least one bin.' });
  }
  const bins = await Bin.find({ _id: { $in: ids } })
    .sort({ fillLevel: -1 })
    .limit(MAX_WAYPOINTS)
    .lean();
  if (!bins.length) {
    return res.status(400).json({ ok: false, message: 'No valid bins found.' });
  }
  const depotLat = parseFloat(process.env.DEPOT_LAT) || 28.6139;
  const depotLng = parseFloat(process.env.DEPOT_LNG) || 77.209;
  const origin = `${depotLat},${depotLng}`;
  const destination = origin;
  const waypoints = bins.map((b) => `${b.location.lat},${b.location.lng}`);
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || key.includes('your_google')) {
    return res.status(503).json({
      ok: false,
      message: 'Set GOOGLE_MAPS_API_KEY in .env for live routing.',
    });
  }
  const client = new Client({});
  try {
    const response = await client.directions({
      params: {
        origin,
        destination,
        waypoints: [`optimize:true|${waypoints.join('|')}`],
        key,
      },
      timeout: 20000,
    });
    if (response.data.status !== 'OK' || !response.data.routes?.length) {
      return res.status(400).json({
        ok: false,
        message: response.data.error_message || response.data.status || 'Directions failed.',
      });
    }
    const route = response.data.routes[0];
    const order = route.waypoint_order || [];
    const orderedBinIds = order.map((i) => bins[i]._id.toString());
    const legs = route.legs || [];
    const stepsHtml = legs
      .map((leg) =>
        (leg.steps || [])
          .map((s) => s.html_instructions?.replace(/<[^>]+>/g, '') || '')
          .filter(Boolean)
      )
      .flat();
    res.json({
      ok: true,
      encodedPolyline: route.overview_polyline?.points || '',
      orderedBinIds,
      steps: stepsHtml,
      bins: orderedBinIds.map((bid) => {
        const b = bins.find((x) => x._id.toString() === bid);
        return b
          ? { id: bid, binId: b.binId, fillLevel: b.fillLevel, address: b.location?.address }
          : { id: bid };
      }),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: e.message || 'Directions request failed.' });
  }
};

exports.assignRoute = async (req, res) => {
  const { driverId, orderedBinIds, encodedPolyline, legsSummary } = req.body;
  if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
    req.flash('error', 'Choose a driver.');
    return res.redirect('/admin/routes');
  }
  const ids = (Array.isArray(orderedBinIds) ? orderedBinIds : String(orderedBinIds || '').split(','))
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!ids.length) {
    req.flash('error', 'Generate a route first.');
    return res.redirect('/admin/routes');
  }
  const depot = {
    lat: parseFloat(process.env.DEPOT_LAT) || 28.6139,
    lng: parseFloat(process.env.DEPOT_LNG) || 77.209,
    address: process.env.DEPOT_ADDRESS || 'Depot',
  };
  const routeDate = startOfToday();
  await RouteAssignment.findOneAndUpdate(
    { driver: driverId, routeDate },
    {
      driver: driverId,
      routeDate,
      binIds: ids,
      orderedBinIds: ids,
      depot,
      encodedPolyline: encodedPolyline || '',
      legsSummary: legsSummary || '',
      status: 'assigned',
      createdBy: req.session.user.id,
    },
    { upsert: true, new: true }
  );
  await Bin.updateMany({ _id: { $in: ids } }, { assignedDriver: driverId });
  req.flash('success', 'Route assigned — the driver will see it on their map.');
  res.redirect('/admin/routes');
};

exports.complaintsPage = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { status, priority, category, ward } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (ward) filter['location.ward'] = new RegExp(escapeRegex(ward), 'i');
  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('citizen', 'name email phone')
      .populate('assignedDriver', 'name vehicleNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Complaint.countDocuments(filter),
  ]);
  const drivers = await Driver.find({}).sort({ name: 1 }).lean();
  res.render('admin/complaints', {
    title: 'Complaints',
    complaints,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    total,
    filters: { status, priority, category, ward },
    drivers,
  });
};

exports.updateComplaint = async (req, res) => {
  const { id } = req.params;
  const { status, adminRemarks, priority, assignedDriver } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'Invalid complaint.');
    return res.redirect('/admin/complaints');
  }
  const update = {};
  if (status) update.status = status;
  if (priority) update.priority = priority;
  if (adminRemarks !== undefined) update.adminRemarks = adminRemarks;
  if (assignedDriver) {
    update.assignedDriver = assignedDriver === 'none' ? null : assignedDriver;
  }
  if (status === 'resolved') update.resolvedAt = new Date();
  const existing = await Complaint.findById(id);
  if (!existing) {
    req.flash('error', 'Complaint not found.');
    return res.redirect('/admin/complaints');
  }
  const changed =
    (status && status !== existing.status) ||
    (adminRemarks !== undefined && adminRemarks !== existing.adminRemarks);
  if (changed) update.citizenUnread = true;
  await Complaint.findByIdAndUpdate(id, update);
  req.flash('success', 'Complaint updated.');
  res.redirect('/admin/complaints');
};

exports.analyticsPage = async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [dailyAgg, categoryAgg, statusAgg, zoneBins] = await Promise.all([
    Complaint.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Complaint.aggregate([
      { $match: {} },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Bin.aggregate([
      { $match: { isActive: true, 'location.zone': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$location.zone',
          avgFill: { $avg: '$fillLevel' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7 * 8);
  const weeklyResolved = await Complaint.aggregate([
    {
      $match: {
        resolvedAt: { $gte: weekStart },
      },
    },
    {
      $group: {
        _id: {
          y: { $isoWeekYear: '$resolvedAt' },
          w: { $isoWeek: '$resolvedAt' },
        },
        resolved: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.w': 1 } },
  ]);
  const weeklyFiled = await Complaint.aggregate([
    { $match: { createdAt: { $gte: weekStart } } },
    {
      $group: {
        _id: {
          y: { $isoWeekYear: '$createdAt' },
          w: { $isoWeek: '$createdAt' },
        },
        filed: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.w': 1 } },
  ]);
  res.render('admin/analytics', {
    title: 'Analytics',
    dailyLabels: dailyAgg.map((d) => d._id),
    dailyValues: dailyAgg.map((d) => d.count),
    categoryLabels: categoryAgg.map((c) => c._id || 'unknown'),
    categoryValues: categoryAgg.map((c) => c.count),
    statusLabels: statusAgg.map((s) => s._id),
    statusValues: statusAgg.map((s) => s.count),
    zoneLabels: zoneBins.map((z) => z._id),
    zoneAvgFill: zoneBins.map((z) => Math.round(z.avgFill || 0)),
    weeklyResolved,
    weeklyFiled,
  });
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
