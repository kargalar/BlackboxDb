import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get table schema information
async function getTableSchema() {
    console.log('🔍 Getting table schema information...');

    // Try to get schema from information_schema (might be blocked)
    try {
        const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'app_user')
            .eq('table_schema', 'public');

        if (error) {
            console.log('❌ Schema query blocked:', error.message);
        } else {
            console.log('✅ Table schema:', data);
        }
    } catch (e) {
        console.log('❌ Schema access failed:', e.message);
    }

    // Alternative: Try an insert with detailed error to understand structure
    console.log('\n🔍 Testing different field combinations...');

    const testUserId = '00000000-0000-0000-0000-000000000003';

    // Test different field combinations
    const testCombinations = [
        // Basic fields
        { auth_user_id: testUserId, username: 'test', email: 'test@test.com' },
        // With additional nullable fields
        {
            auth_user_id: testUserId,
            username: 'test',
            email: 'test@test.com',
            bio: null,
            picture_path: null,
            personality_analyze: null
        },
        // Check if there's an 'id' field
        {
            id: 1,
            auth_user_id: testUserId,
            username: 'test',
            email: 'test@test.com'
        }
    ];

    for (let i = 0; i < testCombinations.length; i++) {
        try {
            console.log(`\nTest ${i + 1}:`, testCombinations[i]);

            const { data, error } = await supabase
                .from('app_user')
                .insert(testCombinations[i])
                .select('*');

            if (error) {
                console.log(`❌ Test ${i + 1} failed:`, error.message);
                console.log('   Details:', error.details);
                console.log('   Hint:', error.hint);
                console.log('   Code:', error.code);
            } else {
                console.log(`✅ Test ${i + 1} successful:`, data);
                // Clean up
                await supabase.from('app_user').delete().eq('auth_user_id', testUserId);
                break;
            }
        } catch (e) {
            console.log(`❌ Test ${i + 1} exception:`, e.message);
        }
    }
}

getTableSchema();
