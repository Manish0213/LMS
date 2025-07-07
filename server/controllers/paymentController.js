import stripe from "stripe";

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'inr', courseId } = req.body;
        const userId = req.auth.userId;

        // Validate inputs
        if (!amount || !courseId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount and courseId are required' 
            });
        }

        // Create Payment Intent
        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to paise
            currency,
            payment_method_types: ['card'],
            metadata: {
                courseId,
                userId
            }
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error('Payment Intent Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

export const confirmEnrollment = async (req, res) => {
    try {
        const { courseId, paymentIntentId } = req.body;
        const userId = req.auth.userId;

        // Verify payment with Stripe
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment not successful' 
            });
        }

        // Verify metadata matches
        if (paymentIntent.metadata.courseId !== courseId || 
            paymentIntent.metadata.userId !== userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment verification failed' 
            });
        }

        // Import models
        const Course = (await import("../models/Course.js")).default;
        const Purchase = (await import("../models/Purchase.js")).default;
        const User = (await import("../models/User.js")).default;

        // Check if already purchased
        const alreadyPurchased = await Purchase.findOne({ courseId, userId });
        if (alreadyPurchased) {
            return res.json({ 
                success: false, 
                message: 'Already enrolled in this course' 
            });
        }

        // Get course data
        const courseData = await Course.findById(courseId);
        if (!courseData) {
            return res.status(404).json({ 
                success: false, 
                message: 'Course not found' 
            });
        }

        // Create purchase record
        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
            paymentIntentId
        };

        await Purchase.create(purchaseData);

        // Add course to user's enrolled courses
        await User.findByIdAndUpdate(userId, {
            $addToSet: { enrolledCourses: courseId }
        });

        res.json({ 
            success: true, 
            message: 'Enrollment successful' 
        });

    } catch (error) {
        console.error('Confirm Enrollment Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}; 