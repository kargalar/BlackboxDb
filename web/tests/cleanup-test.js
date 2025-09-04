import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sign in with test user to clean up
async function cleanUpTestUsers() {
    console.log('🧹 Cleaning up test users...');

    // Try signing in with last test user
    try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'sessiontest_1756989135532@example.com',
            password: 'sessiontest123456'
        });

        if (signInError) {
            console.log('⚠️ Could not sign in to test user:', signInError.message);
        } else {
            console.log('✅ Signed in as test user');

            // Check current app_user records
            const { data: appUsers, error: fetchError } = await supabase
                .from('app_user')
                .select('*');

            if (!fetchError && appUsers) {
                console.log(`📊 Found ${appUsers.length} app_user records:`);
                appUsers.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.username} (${user.email}) - Created: ${user.created_at}`);
                });
            }

            // Sign out
            await supabase.auth.signOut();
            console.log('✅ Signed out');
        }
    } catch (e) {
        console.error('❌ Cleanup failed:', e);
    }
}

cleanUpTestUsers();
