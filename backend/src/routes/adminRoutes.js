const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Patients
router.get('/patients', adminController.getAllPatients);
router.post('/patients', adminController.createPatient);
router.put('/patients/:id', adminController.updatePatient);
router.delete('/patients/:id', adminController.deletePatient);
router.post('/patients/:id/reset-password', adminController.resetPassword);

// Staff
router.get('/staff', adminController.getAllStaff);
router.post('/staff', adminController.createStaff);
router.put('/staff/:id', adminController.updateStaff);
router.delete('/staff/:id', adminController.deleteStaff);

// Appointments
router.get('/appointments', adminController.getAllAppointments);

module.exports = router;
