function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  req.flash('error', 'Please sign in to continue.');
  return res.redirect('/auth/landing');
}

function isCitizen(req, res, next) {
  if (req.session.user && req.session.user.role === 'citizen') return next();
  req.flash('error', 'Citizen access only.');
  return res.redirect('/auth/landing');
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  req.flash('error', 'Municipality access only.');
  return res.redirect('/auth/landing');
}

function isDriver(req, res, next) {
  if (req.session.user && req.session.user.role === 'driver') return next();
  req.flash('error', 'Driver access only.');
  return res.redirect('/auth/landing');
}

module.exports = {
  isAuthenticated,
  isCitizen,
  isAdmin,
  isDriver,
};
