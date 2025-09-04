import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create user and keep session to check app_user immediately
async function testWithSession() {
    console.log('🔍 Testing with active session...');

    try {
        const testEmail = `sessiontest_${Date.now()}@example.com`;
        const testPassword = 'sessiontest123456';
        const testUsername = 'sessionuser' + Date.now();

        console.log('➕ Creating auth user:', testEmail);

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

        console.log('✅ Auth user created:', authData.user?.id);
        console.log('Session exists:', !!authData.session);
        console.log('User confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No');

        // Wait for trigger
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check app_user with current session
        console.log('🔍 Checking app_user while authenticated...');

        const { data: appUsers, error: appError } = await supabase
            .from('app_user')
            .select('*');

        if (appError) {
            console.error('❌ Error fetching app_user:', appError);
        } else {
            console.log(`✅ Found ${appUsers.length} app_user records:`);
            appUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.auth_user_id} - ${user.username} (${user.email})`);
            });
        }

        // Also check specific user
        const { data: specificUser, error: specificError } = await supabase
            .from('app_user')
            .select('*')
            .eq('auth_user_id', authData.user?.id)
            .maybeSingle();

        if (specificError) {
            console.error('❌ Error fetching specific user:', specificError);
        } else if (specificUser) {
            console.log('✅ Found specific user:', specificUser);
        } else {
            console.log('❌ Specific user not found');
        }

        // Don't sign out, keep session active for further testing
        console.log('🔄 Session kept active for further testing');

    } catch (e) {
        console.error('❌ Test failed:', e);
    }
}

testWithSession();
