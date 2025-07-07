import express from 'express';
import { createPaymentIntent, confirmEnrollment } from '../controllers/paymentController.js';
import { clerkMiddleware } from '@clerk/express';

const paymentRouter = express.Router();

// Apply authentication middleware
paymentRouter.use(clerkMiddleware());

// Create Payment Intent
paymentRouter.post('/create-payment-intent', createPaymentIntent);

// Confirm Enrollment after successful payment
paymentRouter.post('/confirm-enrollment', confirmEnrollment);

export default paymentRouter; 