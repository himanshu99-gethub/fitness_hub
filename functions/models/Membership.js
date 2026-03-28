// Membership.js - Membership schema for MongoDB
const { mongoose } = require('../mongodb');

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    planType: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    durationUnit: {
      type: String,
      enum: ['days', 'months', 'years'],
      default: 'months',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    features: [String],
    autoRenew: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Membership', membershipSchema);
