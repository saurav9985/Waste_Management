const bcrypt = require('bcrypt');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');

exports.landing = (req, res) => {
  if (req.session.user) {
    const role = req.session.user.role;
    if (role === 'citizen') return res.redirect('/citizen/dashboard');
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'driver') return res.redirect('/driver/dashboard');
  }
  res.render('auth/landing', { title: 'Welcome' });
};

exports.citizenLoginForm = (req, res) => {
  res.render('auth/citizen-login', { title: 'Citizen sign in' });
};

exports.adminLoginForm = (req, res) => {
  res.render('auth/admin-login', { title: 'Municipality sign in' });
};

exports.driverLoginForm = (req, res) => {
  res.render('auth/driver-login', { title: 'Driver sign in' });
};

exports.citizenRegisterForm = (req, res) => {
  res.render('auth/citizen-register', { title: 'Create account' });
};

exports.citizenRegister = async (req, res) => {
  const { name, email, password, confirmPassword, phone, address, ward } = req.body;
  if (!name || !email || !password) {
    req.flash('error', 'Name, email, and password are required.');
    return res.redirect('/auth/citizen/register');
  }
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/auth/citizen/register');
  }
  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters.');
    return res.redirect('/auth/citizen/register');
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    req.flash('error', 'That email is already registered. Try logging in instead.');
    return res.redirect('/auth/citizen/login');
  }
  await User.create({
    name: name.trim(),
    email,
    password,
    phone,
    address,
    ward,
    role: 'citizen',
  });
  req.flash('success', 'Welcome aboard — you can sign in now.');
  res.redirect('/auth/citizen/login');
};

exports.citizenLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/citizen/login');
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.role !== 'citizen') {
    req.flash('error', 'No citizen account found for that email.');
    return res.redirect('/auth/citizen/login');
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    req.flash('error', 'Incorrect password. Please try again.');
    return res.redirect('/auth/citizen/login');
  }
  req.session.user = {
    id: user._id.toString(),
    name: user.name,
    role: 'citizen',
  };
  req.flash('success', `Good to see you, ${user.name}.`);
  res.redirect('/citizen/dashboard');
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/admin/login');
  }
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) {
    req.flash('error', 'No municipality account found for that email.');
    return res.redirect('/auth/admin/login');
  }
  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    req.flash('error', 'Incorrect password. Please try again.');
    return res.redirect('/auth/admin/login');
  }
  req.session.user = {
    id: admin._id.toString(),
    name: admin.name,
    role: 'admin',
  };
  req.flash('success', `Signed in — ${admin.name}`);
  res.redirect('/admin/dashboard');
};

exports.driverLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/driver/login');
  }
  const driver = await Driver.findOne({ email: email.toLowerCase() });
  if (!driver) {
    req.flash('error', 'No driver account found for that email.');
    return res.redirect('/auth/driver/login');
  }
  const match = await bcrypt.compare(password, driver.password);
  if (!match) {
    req.flash('error', 'Incorrect password. Please try again.');
    return res.redirect('/auth/driver/login');
  }
  req.session.user = {
    id: driver._id.toString(),
    name: driver.name,
    role: 'driver',
  };
  req.flash('success', `On the road — ${driver.name}`);
  res.redirect('/driver/dashboard');
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/auth/landing');
  });
};
