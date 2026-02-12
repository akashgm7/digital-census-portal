const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/addresses', require('./routes/addressRoutes'));
app.use('/api/v1/users/zones', require('./routes/zoneRoutes'));
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/surveys', require('./routes/surveyRoutes'));
app.use('/api/v1/analytics', require('./routes/analyticsRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));

// Root Endpoint
app.get('/', (req, res) => {
    res.send('Census Portal API is running');
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Keep process alive and handle potential errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

// Prevent immediate exit
setInterval(() => { }, 1000 * 60 * 60);
