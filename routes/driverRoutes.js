const express = require('express');
const router = express.Router();
const { isDriver } = require('../middleware/authMiddleware');
const driver = require('../controllers/driverController');

router.use(isDriver);

router.get('/dashboard', driver.dashboard);
router.get('/route-map', driver.routeMapPage);
router.patch('/availability', driver.toggleAvailability);
router.post('/bins/:binId/collected', driver.markCollected);
router.post('/location', driver.updateLocation);

module.exports = router;
