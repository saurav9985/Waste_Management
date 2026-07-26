require('dotenv').config();
require('express-async-errors');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const connectDB = require('./config/db');
const { registerErrorHandlers } = require('./middleware/errorMiddleware');

const app = express();
connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  res.locals.depot = {
    lat: parseFloat(process.env.DEPOT_LAT) || 28.6139,
    lng: parseFloat(process.env.DEPOT_LNG) || 77.209,
    address: process.env.DEPOT_ADDRESS || 'Depot',
  };
  next();
});

app.use('/auth', require('./routes/authRoutes'));
app.use('/citizen', require('./routes/citizenRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/driver', require('./routes/driverRoutes'));

app.get('/', (req, res) => res.redirect('/auth/landing'));

registerErrorHandlers(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
