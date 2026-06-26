const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

const corsOptions = {
  origin: ['https://fitnova-web-nine.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  weight: { type: Number, default: null },
  height: { type: Number, default: null },
  fitnessGoal: { type: String, default: null },
  profileComplete: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

app.post('/api/user/profile', async (req, res) => {
  try {
    const { userId, weight, height, goal } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    if (weight === undefined || height === undefined || !goal) {
      return res.status(400).json({
        success: false,
        error: 'weight, height, and goal are required',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        weight: Number(weight),
        height: Number(height),
        fitnessGoal: goal,
        profileComplete: true,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile saved!',
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        weight: updatedUser.weight,
        height: updatedUser.height,
        fitnessGoal: updatedUser.fitnessGoal,
        profileComplete: updatedUser.profileComplete,
      },
    });
  } catch (error) {
    console.error('Profile save error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API running' });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log('Server started');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });