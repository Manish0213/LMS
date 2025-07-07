import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { getToken } from '../../../utils/auth';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_PUBLISHABLE_KEY');

const CheckoutForm = ({ courseData, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getToken();
      
      // Calculate amount with discount
      const amount = courseData.coursePrice - (courseData.discount * courseData.coursePrice / 100);

      // 1. Create PaymentIntent
      const { data } = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/payment/create-payment-intent`,
        { 
          amount, 
          currency: 'inr', 
          courseId: courseData._id 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.success) {
        toast.error(data.message);
        setLoading(false);
        return;
      }

      // 2. Confirm Card Payment
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        toast.error(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        // 3. Confirm Enrollment
        const confirmRes = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/payment/confirm-enrollment`,
          { 
            courseId: courseData._id, 
            paymentIntentId: result.paymentIntent.id 
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (confirmRes.data.success) {
          toast.success('Enrollment successful!');
          onSuccess && onSuccess();
        } else {
          toast.error(confirmRes.data.message);
        }
      }
    } catch (error) {
      console.error('Payment Error:', error);
      toast.error(error.response?.data?.message || error.message);
    }
    setLoading(false);
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: 'Inter, Arial, sans-serif',
        '::placeholder': {
          color: '#a0aec0',
        },
        backgroundColor: '#f7fafc',
      },
      invalid: {
        color: '#e53e3e',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Course: {courseData.courseTitle}</h3>
        <p className="text-gray-600">
          Amount: ₹{courseData.coursePrice - (courseData.discount * courseData.coursePrice / 100)}
          {courseData.discount > 0 && (
            <span className="text-green-600 ml-2">
              ({courseData.discount}% off)
            </span>
          )}
        </p>
      </div>
      
      <div className="mb-4 p-3 border border-gray-300 rounded-md bg-gray-50">
        <CardElement options={cardElementOptions} />
      </div>
      
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing Payment...' : 'Enroll Now'}
      </button>
      
      <div className="mt-3 text-xs text-gray-500">
        <p>💳 Test Card: 4000 0027 6000 3184</p>
        <p>📱 OTP: 123456 (when prompted)</p>
      </div>
    </form>
  );
};

const StripeCheckout = ({ courseData, onSuccess }) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm courseData={courseData} onSuccess={onSuccess} />
  </Elements>
);

export default StripeCheckout; 