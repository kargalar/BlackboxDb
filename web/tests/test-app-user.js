import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test app_user table structure
async function testAppUserTable() {
    console.log('🔍 Testing app_user table structure...');

    // Try to insert a test record to see the expected structure
    try {
        const testUserId = '00000000-0000-0000-0000-000000000001';

        const { data, error } = await supabase
            .from('app_user')
            .insert({
                auth_user_id: testUserId,
                username: 'testuser',
                email: 'test@example.com',
                bio: '',
                picture_path: null
            })
            .select('*');

        if (error) {
            console.log('❌ Insert error:', error);
            console.log('Error details:', error.details, error.hint, error.code);
        } else {
            console.log('✅ Test insert successful:', data);

            // Clean up test record
            await supabase.from('app_user').delete().eq('auth_user_id', testUserId);
        }
    } catch (e) {
        console.error('❌ Test failed:', e);
    }

    // Try to get table info via RPC or select with error handling
    console.log('\n🔍 Trying different insert approaches...');

    // Test minimal insert
    try {
        const testUserId2 = '00000000-0000-0000-0000-000000000002';

        const { data, error } = await supabase
            .from('app_user')
            .insert({
                auth_user_id: testUserId2,
                username: 'testuser2',
                email: 'test2@example.com'
            })
            .select('*');

        if (error) {
            console.log('❌ Minimal insert error:', error);
        } else {
            console.log('✅ Minimal insert successful:', data);

            // Clean up test record
            await supabase.from('app_user').delete().eq('auth_user_id', testUserId2);
        }
    } catch (e) {
        console.error('❌ Minimal test failed:', e);
    }
}

testAppUserTable();
