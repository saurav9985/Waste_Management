const User = require('../models/User');
const Bin = require('../models/Bin');
const Complaint = require('../models/Complaint');

const PAGE_SIZE = 10;

exports.dashboard = async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  const ward = user.ward || '';
  const query = { isActive: true };
  if (ward) query['location.ward'] = ward;
  const bins = await Bin.find(query).sort({ fillLevel: -1 }).lean();
  const unreadCount = await Complaint.countDocuments({
    citizen: req.session.user.id,
    citizenUnread: true,
  });
  res.render('citizen/dashboard', {
    title: 'Your dashboard',
    user,
    bins,
    unreadCount,
  });
};

exports.newComplaintForm = async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  res.render('citizen/file-complaint', {
    title: 'Tell us what is wrong',
    user,
  });
};

exports.createComplaint = async (req, res) => {
  const { title, description, category, address, ward, lat, lng } = req.body;
  if (!title || !description) {
    req.flash('error', 'Title and description are required.');
    return res.redirect('/citizen/complaints/new');
  }
  const images = (req.files || []).map((f) => `/uploads/complaints/${f.filename}`);
  await Complaint.create({
    citizen: req.session.user.id,
    title: title.trim(),
    description: description.trim(),
    category: category || 'other',
    location: {
      address,
      ward,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
    },
    images,
    citizenUnread: false,
  });
  req.flash('success', 'Your complaint has been filed. We are on it.');
  res.redirect('/citizen/complaints');
};

exports.listComplaints = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = { citizen: req.session.user.id };
  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Complaint.countDocuments(filter),
  ]);
  await Complaint.updateMany(
    { citizen: req.session.user.id, citizenUnread: true },
    { $set: { citizenUnread: false } }
  );
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  res.render('citizen/my-complaints', {
    title: 'Your complaints',
    complaints,
    page,
    totalPages,
    total,
  });
};
