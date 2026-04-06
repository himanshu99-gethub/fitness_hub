const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.error('❌ Supabase URL or Key missing. Database operations will fail.');
}

// ==================== USER OPERATIONS ====================

async function createUser(userData) {
  if (!supabase) return { success: false, error: 'Database configuration missing (SUPABASE_URL/KEY)' };
  try {
    // Extract fields
    let { email, password, firstName, lastName, name, phone, age, gender, weight, height, fitnessGoal } = userData;
    
    // Fallback: If only 'name' is provided, split it into first and last
    if (!firstName && name) {
      const parts = name.trim().split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || 'User'; // Default last name if missing
    }

    // Final safety: ensures required fields are never null
    firstName = firstName || 'New';
    lastName = lastName || 'User';

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password, 
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
        age: parseInt(age) || null,
        gender: gender || 'Not Specified',
        weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        fitness_goal: fitnessGoal || 'General Fitness',
        role: 'user',
        is_verified: false,
        membership_status: 'inactive'
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, user: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function findUserByEmail(email) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, user: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateUserProfile(userId, updateData) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, user: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== MEMBERSHIP OPERATIONS ====================

async function createMembership(membershipData) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { userId, planName, planType, price, duration, durationUnit, startDate, endDate, features, autoRenew } = membershipData;
    
    const { data, error } = await supabase
      .from('memberships')
      .insert([{
        user_id: userId,
        plan_name: planName,
        plan_type: planType,
        price,
        duration,
        duration_unit: durationUnit,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        features,
        auto_renew: autoRenew
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Update user status
    await supabase.from('users').update({ membership_status: 'active' }).eq('id', userId);
    
    return { success: true, membership: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getUserActiveMembership(userId) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, membership: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== PAYMENT OPERATIONS ====================

async function createPayment(paymentData) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { userId, membershipId, amount, currency, paymentMethod, transactionId, status, description } = paymentData;
    
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        membership_id: membershipId,
        amount,
        currency,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        status,
        description
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, payment: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getUserPayments(userId) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, payments: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== OTP OPERATIONS ====================

async function generateOTP(email) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('otps')
      .insert([{
        email: email.toLowerCase(),
        otp,
        attempts: 0,
        verified: false,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, otp };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function verifyOTP(email, otp) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { data: record, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error || !record) return { success: false, message: 'OTP not found' };
    
    if (new Date() > new Date(record.expires_at)) {
      return { success: false, message: 'OTP has expired' };
    }
    
    if (record.attempts >= 5) {
      return { success: false, message: 'Too many attempts. Request new OTP.' };
    }
    
    if (record.otp !== otp) {
      await supabase.from('otps').update({ attempts: record.attempts + 1 }).eq('id', record.id);
      return { success: false, message: 'Invalid OTP' };
    }
    
    await supabase.from('otps').update({ verified: true }).eq('id', record.id);
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== ADMIN OPERATIONS ====================

async function getAllUsers() {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, users: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteUser(userId) {
  if (!supabase) return { success: false, error: 'Database configuration missing' };
  try {
    // Delete payments first (foreign key constraint)
    const { error: pError } = await supabase.from('payments').delete().eq('user_id', userId);
    // Delete memberships
    const { error: mError } = await supabase.from('memberships').delete().eq('user_id', userId);
    
    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  updateUserProfile,
  createMembership,
  getUserActiveMembership,
  createPayment,
  getUserPayments,
  generateOTP,
  verifyOTP,
  getAllUsers,
  deleteUser
};
