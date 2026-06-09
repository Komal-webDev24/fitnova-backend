// server.js - Complete FitNova Backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ========================================
// 1. MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());

// ========================================
// 2. USER SCHEMA (Your existing code)
// ========================================
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  },
  fitnessGoal: {
    type: String,
    default: null
  },
  profileComplete: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ========================================
// 3. WORKOUT SCHEMA (NEW - Add after User schema)
// ========================================
const workoutSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  exerciseName: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: null
  },
  completed: {
    type: Boolean,
    default: false
  },
  sets: {
    type: Number,
    default: null
  },
  reps: {
    type: Number,
    default: null
  },
  weight: {
    type: Number, // in kg
    default: null
  }
}, { timestamps: true });

const Workout = mongoose.model('Workout', workoutSchema);

// ========================================
// 4. ROUTES
// ========================================

// POST /api/register - Signup
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      fullName,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/profile-setup - Profile Setup
app.post('/api/profile-setup', async (req, res) => {
  try {
    const { userId, weight, height, fitnessGoal } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!weight || !height || !fitnessGoal) {
      return res.status(400).json({ error: 'Weight, height, and fitness goal are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.weight = weight;
    user.height = height;
    user.fitnessGoal = fitnessGoal;
    user.profileComplete = true;

    await user.save();

    res.status(200).json({
      message: 'Profile setup completed successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        weight: user.weight,
        height: user.height,
        fitnessGoal: user.fitnessGoal
      }
    });
  } catch (error) {
    console.error('Profile setup error:', error);
    res.status(500).json({ error: 'Server error during profile setup' });
  }
});

// GET /api/user/:userId - Fetch user data (NEW)
app.get('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate BMI if weight and height exist
    let bmi = user.bmi;
    if (user.weight && user.height && !bmi) {
      const heightInMeters = user.height / 100;
      bmi = (user.weight / (heightInMeters * heightInMeters)).toFixed(1);
      user.bmi = bmi;
      await user.save();
    }

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        weight: user.weight,
        height: user.height,
        fitnessGoal: user.fitnessGoal,
        bmi: bmi,
        profileComplete: user.profileComplete
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/start-workout - Start a new workout (NEW)
app.post('/api/start-workout', async (req, res) => {
  try {
    const { userId, exerciseName } = req.body;

    // Validation
    if (!userId || !exerciseName) {
      return res.status(400).json({ error: 'User ID and exercise name are required' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has an active workout
    const existingActiveWorkout = await Workout.findOne({ 
      userId, 
      completed:false
    });

    if (existingActiveWorkout) {
      return res.status(400).json({ 
        error: 'You already have an active workout. Please complete it before starting a new one.',
        workout: existingActiveWorkout
      });
    }

    // Create new workout
    const workout = new Workout({
      userId,
      exerciseName
    });

    await workout.save();

    res.status(201).json({
      message: 'Workout started successfully',
      workout: {
        _id: workout._id,
        userId: workout.userId,
        exerciseName: workout.exerciseName,
        startTime: workout.startTime,
        completed: workout.completed
      }
    });
  } catch (error) {
    console.error('Error starting workout:', error);
    res.status(500).json({ error: 'Server error while starting workout' });
  }
});

// POST /api/end-workout - End current workout (NEW)
app.post('/api/end-workout', async (req, res) => {
  try {
    const { userId, workoutId, sets, reps, weight } = req.body;

    if (!userId || !workoutId) {
      return res.status(400).json({ error: 'User ID and workout ID are required' });
    }

    const workout = await Workout.findOne({ 
      _id: workoutId, 
      userId,
      completed: false
    });

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found or already completed' });
    }

    // End workout
    workout.endTime = new Date();
    workout.completed = true;
    workout.duration = Math.floor((workout.endTime - workout.startTime) / 1000); // seconds
    
    // Optional: Save workout details
    if (sets) workout.sets = sets;
    if (reps) workout.reps = reps;
    if (weight) workout.weight = weight;

    await workout.save();

    res.json({
      message: 'Workout completed successfully',
      workout: {
        _id: workout._id,
        exerciseName: workout.exerciseName,
        startTime: workout.startTime,
        endTime: workout.endTime,
        duration: workout.duration,
        sets: workout.sets,
        reps: workout.reps,
        weight: workout.weight
      }
    });
  } catch (error) {
    console.error('Error ending workout:', error);
    res.status(500).json({ error: 'Server error while ending workout' });
  }
});

// GET /api/workouts/history/:userId - Get workout history (NEW)
app.get('/api/workouts/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const workouts = await Workout.find({ userId })
      .sort({ startTime: -1 })
      .limit(20);

    res.json({ workouts });
  } catch (error) {
    console.error('Error fetching workout history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================================
// 5. CONNECT TO MONGODB & START SERVER
// ========================================
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`
📋 API Endpoints:
   POST   /api/register              - Signup
   POST   /api/profile-setup         - Profile Setup
   GET    /api/user/:userId          - Fetch user data
   POST   /api/start-workout         - Start workout
   POST   /api/end-workout           - End workout
   GET    /api/workouts/history/:id  - Workout history
      `);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });