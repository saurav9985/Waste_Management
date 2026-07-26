const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.get('/landing', auth.landing);

router.get('/citizen/login', auth.citizenLoginForm);
router.post('/citizen/login', auth.citizenLogin);
router.get('/citizen/register', auth.citizenRegisterForm);
router.post('/citizen/register', auth.citizenRegister);

router.get('/admin/login', auth.adminLoginForm);
router.post('/admin/login', auth.adminLogin);

router.get('/driver/login', auth.driverLoginForm);
router.post('/driver/login', auth.driverLogin);

router.post('/logout', auth.logout);
router.get('/logout', auth.logout);

module.exports = router;
