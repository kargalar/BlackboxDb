import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test creating a real user and then inserting to app_user
async function testRealUserFlow() {
    console.log('🔍 Testing real user flow...');

    try {
        const testEmail = `realtest_${Date.now()}@example.com`;
        const testPassword = 'realtest123456';
        const testUsername = 'realuser' + Date.now();

        console.log('➕ Step 1: Creating auth user:', testEmail);

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    username: testUsername
                }
            }
        });

        if (authError) {
            console.error('❌ Auth signup failed:', authError);
            return;
        }

        if (!authData.user) {
            console.error('❌ No user returned from auth');
            return;
        }

        console.log('✅ Auth user created:', authData.user.id);
        console.log('Session:', authData.session ? 'Created' : 'No session');

        // Wait a bit for any triggers to run
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('➕ Step 2: Checking if app_user was auto-created...');

        // Check if user was auto-created by trigger
        const { data: existingUser, error: checkError } = await supabase
            .from('app_user')
            .select('*')
            .eq('auth_user_id', authData.user.id)
            .maybeSingle();

        if (checkError) {
            console.log('⚠️ Check existing user error:', checkError);
        }

        if (existingUser) {
            console.log('✅ app_user was auto-created by trigger:', existingUser);
        } else {
            console.log('❌ No app_user found, trigger didn\'t work');

            // Try manual creation while authenticated
            console.log('➕ Step 3: Manual app_user creation while authenticated...');

            const { data: insertData, error: insertError } = await supabase
                .from('app_user')
                .insert({
                    auth_user_id: authData.user.id,
                    username: testUsername,
                    email: testEmail,
                    bio: '',
                    picture_path: null
                })
                .select('*');

            if (insertError) {
                console.error('❌ Manual app_user creation failed:', insertError);
                console.log('   Details:', insertError.details, insertError.hint, insertError.code);
            } else {
                console.log('✅ Manual app_user creation successful:', insertData);
            }
        }

        // Sign out for cleanup
        await supabase.auth.signOut();

    } catch (e) {
        console.error('❌ Test failed:', e);
    }
}

testRealUserFlow();
