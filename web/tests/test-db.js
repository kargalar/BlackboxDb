import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test database connection and list tables
async function testDatabaseConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');

        // Check basic connection
        const { data: userData, error: userError } = await supabase.auth.getUser();
        console.log('Auth status:', userData?.user ? 'Authenticated' : 'Not authenticated');

        // List available tables by trying to select from common ones
        const tables = ['app_user', 'content', 'user_content_log', 'review'];

        for (const table of tables) {
            try {
                const { data, error, count } = await supabase
                    .from(table)
                    .select('*', { count: 'exact' })
                    .limit(1);

                if (error) {
                    console.log(`❌ Table '${table}':`, error.message);
                } else {
                    console.log(`✅ Table '${table}': ${count} rows, sample:`, data?.[0] ? 'has data' : 'empty');
                    if (data?.[0]) {
                        console.log(`   Sample columns:`, Object.keys(data[0]).join(', '));
                    }
                }
            } catch (e) {
                console.log(`❌ Table '${table}':`, e.message);
            }
        }

        // Test RPC functions
        console.log('\n🔍 Testing RPC functions...');
        try {
            const { data, error } = await supabase.rpc('get_user_contents', {
                user_id_param: '00000000-0000-0000-0000-000000000000',
                log_user_id_param: '00000000-0000-0000-0000-000000000000',
                content_type_param: 1,
                page_param: 1,
                limit_param: 1
            });

            if (error) {
                console.log('❌ RPC get_user_contents:', error.message);
            } else {
                console.log('✅ RPC get_user_contents: working');
            }
        } catch (e) {
            console.log('❌ RPC get_user_contents:', e.message);
        }

    } catch (error) {
        console.error('❌ Connection failed:', error);
    }
}

testDatabaseConnection();
