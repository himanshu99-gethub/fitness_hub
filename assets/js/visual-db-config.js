// ============================================
// VISUAL DB / PostgreSQL CONFIGURATION
// ============================================

// 🔑 FILL IN YOUR DATABASE DETAILS BELOW

// Option A: Using Supabase (RECOMMENDED)
// 1. Create free account at supabase.com
// 2. Import your Neon PostgreSQL database
// 3. Copy API URL and anon key from Settings > API

// Option B: Using Supabase with Neon (EASIEST)
// 1. Go to https://supabase.com
// 2. Create new project connected to your Neon database
// 3. Get credentials from project settings

const VISUAL_DB_CONFIG = {
    DATABASE_TYPE: 'supabase',
    
    // Your Supabase credentials
    SUPABASE_URL: 'https://aaejdnriyakebgztsbxz.supabase.co',
    SUPABASE_KEY: 'sb_publishable_2AVJ9XPMm2fjgCbU4G4Rww_40qklJnQ',
    
    // Table names
    USERS_TABLE: 'fitness_users',
    
    // Enable/Disable
    ENABLED: false  // ← TURNED OFF FOR NOW - will enable after basic app works
};

// ============================================
// SUPABASE HELPER FUNCTIONS
// ============================================

// Initialize Supabase client
let supabaseClient = null;

function initSupabaseClient() {
    if (!VISUAL_DB_CONFIG.ENABLED || VISUAL_DB_CONFIG.DATABASE_TYPE !== 'supabase') {
        return null;
    }
    
    if (supabaseClient) return supabaseClient;
    
    // Check if supabase-js is loaded
    if (typeof supabase === 'undefined') {
        console.warn('⚠️ Supabase JS library not loaded. Add this to your HTML:');
        console.warn(`<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`);
        return null;
    }
    
    try {
        supabaseClient = supabase.createClient(
            VISUAL_DB_CONFIG.SUPABASE_URL,
            VISUAL_DB_CONFIG.SUPABASE_KEY
        );
        console.log('✅ Supabase client initialized');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return null;
    }
}

async function saveUserToSupabase(userData) {
    const client = initSupabaseClient();
    if (!client) return false;

    try {
        const { data, error } = await client
            .from(VISUAL_DB_CONFIG.USERS_TABLE)
            .insert([{
                ...userData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);

        if (error) throw error;
        
        console.log('✅ User saved to Supabase:', data);
        return true;
    } catch (error) {
        console.error('❌ Error saving to Supabase:', error);
        return false;
    }
}

async function getUserFromSupabase(email) {
    const client = initSupabaseClient();
    if (!client) return null;

    try {
        const { data, error } = await client
            .from(VISUAL_DB_CONFIG.USERS_TABLE)
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        
        if (data) {
            console.log('✅ User loaded from Supabase');
            return data;
        }
        return null;
    } catch (error) {
        console.error('❌ Error fetching from Supabase:', error);
        return null;
    }
}

async function updateUserInSupabase(email, userData) {
    const client = initSupabaseClient();
    if (!client) return false;

    try {
        const { error } = await client
            .from(VISUAL_DB_CONFIG.USERS_TABLE)
            .update({
                ...userData,
                updated_at: new Date().toISOString()
            })
            .eq('email', email);

        if (error) throw error;
        
        console.log('✅ User updated in Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error updating Supabase:', error);
        return false;
    }
}

// ============================================
// HYBRID SAVE FUNCTION (localStorage + Visual DB)
// ============================================

async function hybridSaveUser(userData) {
    // Always save to localStorage (backup)
    const db = getDatabase();
    const existingUserIndex = db.users.findIndex(u => u.email === userData.email);
    
    if (existingUserIndex >= 0) {
        db.users[existingUserIndex] = { ...db.users[existingUserIndex], ...userData, updated_at: new Date().toISOString() };
    } else {
        db.users.push({
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    saveDatabase(db);
    
    console.log('✅ Saved to localStorage (backup)');

    // Also save to Supabase if enabled
    if (VISUAL_DB_CONFIG.ENABLED && VISUAL_DB_CONFIG.DATABASE_TYPE === 'supabase') {
        if (existingUserIndex >= 0) {
            await updateUserInSupabase(userData.email, userData);
        } else {
            await saveUserToSupabase(userData);
        }
    }
}

async function hybridGetUser(email) {
    // Try Supabase first if enabled
    if (VISUAL_DB_CONFIG.ENABLED && VISUAL_DB_CONFIG.DATABASE_TYPE === 'supabase') {
        const supabaseUser = await getUserFromSupabase(email);
        if (supabaseUser) {
            console.log('✅ User loaded from Supabase');
            return supabaseUser;
        }
    }

    // Fall back to localStorage
    const db = getDatabase();
    const user = db.users.find(u => u.email === email);
    if (user) {
        console.log('✅ User loaded from localStorage (backup)');
    }
    return user;
}

console.log('📊 Visual DB Module Loaded - PostgreSQL/Supabase Ready');
console.log('⚠️ Supabase currently DISABLED - using localStorage only');
console.log('💡 To enable Supabase: Set ENABLED = true in visual-db-config.js');
