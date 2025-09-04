import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate exact web registration flow
async function simulateWebRegistration() {
    console.log('🎯 Simulating web registration flow...');

    try {
        const testEmail = `webtest_${Date.now()}@example.com`;
        const testPassword = 'webtest123456';
        const testUsername = 'webuser' + Date.now();

        console.log('📝 Step 1: User submits registration form');
        console.log('   Email:', testEmail);
        console.log('   Username:', testUsername);

        // This mimics the signUpWithEmail function from AuthContext
        console.log('🔐 Step 2: Calling Supabase Auth signUp...');

        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    username: testUsername
                }
            }
        });

        if (error) {
            console.error('❌ Auth signup failed:', error);
            return;
        }

        console.log('✅ Auth user created:', data.user?.id);
        console.log('📧 Email confirmation required:', data.user?.email_confirmed_at ? 'No' : 'Yes');
        console.log('🔑 Session created:', data.session ? 'Yes' : 'No');

        // Wait for trigger to complete
        console.log('⏱️  Step 3: Waiting for database trigger...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if app_user was created
        console.log('🔍 Step 4: Checking app_user table...');

        const { data: appUser, error: appUserError } = await supabase
            .from('app_user')
            .select('*')
            .eq('auth_user_id', data.user?.id)
            .maybeSingle();

        if (appUserError) {
            console.error('❌ Error checking app_user:', appUserError);
        } else if (appUser) {
            console.log('✅ app_user created successfully!');
            console.log('👤 User details:');
            console.log('   ID:', appUser.auth_user_id);
            console.log('   Username:', appUser.username);
            console.log('   Email:', appUser.email);
            console.log('   Bio:', appUser.bio);
            console.log('   Picture:', appUser.picture_path);
            console.log('   Created:', appUser.created_at);
        } else {
            console.log('❌ app_user was not created');
        }

        // Test sign in
        console.log('🔐 Step 5: Testing sign in with new user...');

        await supabase.auth.signOut(); // Clear current session

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signInError) {
            console.error('❌ Sign in failed:', signInError);
        } else {
            console.log('✅ Sign in successful!');
            console.log('🔍 Checking profile after sign in...');

            const { data: profileCheck, error: profileError } = await supabase
                .from('app_user')
                .select('*')
                .eq('auth_user_id', signInData.user?.id)
                .maybeSingle();

            if (profileError) {
                console.error('❌ Profile check failed:', profileError);
            } else if (profileCheck) {
                console.log('✅ Profile accessible after sign in:', profileCheck.username);
            }
        }

        console.log('🎉 Registration flow test completed!');

    } catch (e) {
        console.error('❌ Test failed:', e);
    }
}

simulateWebRegistration();
