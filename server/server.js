import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import connectCloudinary from './configs/cloudinary.js'
import userRouter from './routes/userRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import { clerkWebhooks, stripeWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'
import courseRouter from './routes/courseRoute.js'
import paymentRoutes from './routes/paymentRoutes.js';

// Initialize Express
const app = express()

// Connect to database
await connectDB()
await connectCloudinary()


// Middlewares
app.use(cors())
app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks)
app.use(express.json())
app.use(clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY
}))

// Routes
app.get('/', (req, res) => res.send("API Working"))
app.post('/clerk' , clerkWebhooks)
//
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)
app.use('/api/payment', express.json(), paymentRoutes);

// Port
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})