import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check app_user table content
async function checkAppUserTable() {
    console.log('🔍 Checking app_user table content...');

    try {
        const { data, error } = await supabase
            .from('app_user')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching app_user:', error);
        } else {
            console.log('✅ app_user table content:');
            console.log(`Found ${data.length} records:`);

            data.forEach((user, index) => {
                console.log(`${index + 1}. ID: ${user.id}`);
                console.log(`   Auth User ID: ${user.auth_user_id}`);
                console.log(`   Username: ${user.username}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Created: ${user.created_at}`);
                console.log('---');
            });
        }
    } catch (e) {
        console.error('❌ Check failed:', e);
    }

    // Also check auth users
    console.log('\n🔍 Checking current auth session...');
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Current session:', session ? 'Authenticated' : 'Not authenticated');

        if (session) {
            console.log('User ID:', session.user.id);
            console.log('Email:', session.user.email);
            console.log('Metadata:', session.user.user_metadata);
        }
    } catch (e) {
        console.error('❌ Session check failed:', e);
    }
}

checkAppUserTable();
