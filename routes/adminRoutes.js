const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/authMiddleware');
const admin = require('../controllers/adminController');

router.use(isAdmin);

router.get('/dashboard', admin.dashboard);
router.get('/bins', admin.binsPage);
router.post('/bins/:id/collect', admin.triggerCollection);
router.get('/routes', admin.routesPage);
router.post('/routes/generate', admin.generateRoute);
router.post('/routes/assign', admin.assignRoute);
router.get('/complaints', admin.complaintsPage);
router.post('/complaints/:id', admin.updateComplaint);
router.get('/analytics', admin.analyticsPage);

module.exports = router;
