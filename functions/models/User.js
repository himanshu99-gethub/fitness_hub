// User.js - User schema for MongoDB
const { mongoose } = require('../mongodb');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: null,
    },
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: null,
    },
    weight: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    fitnessGoal: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'inactive',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
