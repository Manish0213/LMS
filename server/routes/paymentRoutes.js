import express from 'express';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';
const isAuthenticated = require('../middlewares/authMiddleware.js');

const router = express.Router();

router.post('/create-order', isAuthenticated, createOrder);
router.post('/verify-payment', isAuthenticated, verifyPayment);

export default router;