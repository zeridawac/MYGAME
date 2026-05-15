const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bankRoutes = require('./routes/bankRoutes');
const gameRoutes = require('./routes/gameRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const couponRoutes = require('./routes/couponRoutes');
const taskRoutes = require('./routes/taskRoutes');
const settingRoutes = require('./routes/settingRoutes');
const portalChatRoutes = require('./routes/portalChatRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const uploadsStaticRoot = path.resolve(__dirname, '..', 'uploads');

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '6mb' }));
app.use('/uploads', express.static(uploadsStaticRoot));
console.log(`[uploads] static root: ${uploadsStaticRoot}`);

app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API status is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/portal-chat', portalChatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
