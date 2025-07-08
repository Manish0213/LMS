import Razorpay from 'razorpay';
import crypto from 'crypto';
const Purchase = require('../models/Purchase');
const Course = require('../models/Course');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Order Create
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: 'receipt_order_' + Math.random() * 1000,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ Payment Verify
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, courseId } = req.body;
    const userId = req.auth.userId;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      // Save Purchase
      await Purchase.create({
        userId,
        courseId,
        amount: 500, // dynamic kar lena
        status: 'completed',
        paymentId: razorpay_payment_id,
      });

      // Enroll User
      await User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: courseId } });
      await Course.findByIdAndUpdate(courseId, { $addToSet: { enrolledStudents: userId } });

      res.json({ success: true, message: 'Payment Verified & Course Enrolled' });
    } else {
      res.json({ success: false, message: 'Payment Verification Failed' });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};