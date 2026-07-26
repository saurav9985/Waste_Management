const express = require('express');
const router = express.Router();
const { isCitizen } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const citizen = require('../controllers/citizenController');

router.use(isCitizen);

router.get('/dashboard', citizen.dashboard);
router.get('/complaints/new', citizen.newComplaintForm);
router.post(
  '/complaints',
  (req, res, next) => {
    upload.array('images', 3)(req, res, (err) => {
      if (err) {
        req.flash('error', err.message || 'Upload failed.');
        return res.redirect('/citizen/complaints/new');
      }
      next();
    });
  },
  citizen.createComplaint
);
router.get('/complaints', citizen.listComplaints);

module.exports = router;
