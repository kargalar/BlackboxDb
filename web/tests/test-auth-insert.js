import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test authentication and app_user insert
async function testAuthAndInsert() {
    console.log('🔍 Testing auth and app_user insert...');

    // Create a test user
    try {
        const testEmail = `test_${Date.now()}@example.com`;
        const testPassword = 'test123456';
        const testUsername = 'testuser' + Date.now();

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

        // Now try to insert into app_user with authenticated user
        if (authData.user) {
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
                console.error('❌ app_user insert failed:', insertError);
                console.log('Error details:', insertError.details, insertError.hint, insertError.code);
            } else {
                console.log('✅ app_user insert successful:', insertData);
            }
        }

    } catch (e) {
        console.error('❌ Test failed:', e);
    }
}

testAuthAndInsert();
