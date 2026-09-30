const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Sabhi origins se requests allow karne ke liye
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/inquiries', require('./routes/inquiryRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/businesses', require('./routes/business'));

// Root health check route (check karne ke liye ki server live hai ya nahi)
app.get('/', (req, res) => {
  res.send('Chintu Cool API is running successfully!');
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Database connect karke server start karein
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server successfully running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

startServer();