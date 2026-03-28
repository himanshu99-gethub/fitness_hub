// models/index.js - Export all models
const User = require('./User');
const Membership = require('./Membership');
const Payment = require('./Payment');
const OTP = require('./OTP');

module.exports = {
  User,
  Membership,
  Payment,
  OTP,
};
