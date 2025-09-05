import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDirectReviews() {
    console.log('🔍 Testing Direct Review Access...\n');

    // Test 1: RPC ile bypass etmeye çalış
    console.log('--- Test 1: Using RPC (bypass RLS?) ---');
    try {
        const { data, error } = await supabase.rpc('get_content_reviews', {
            content_id_param: 6479
        });
        console.log('RPC result:', error || data);
    } catch (e) {
        console.log('RPC error:', e.message);
    }

    // Test 2: Raw SQL query with count
    console.log('\n--- Test 2: Count Reviews Directly ---');
    try {
        const { count, error } = await supabase
            .from('review')
            .select('*', { count: 'exact', head: true });

        console.log('Total review count:', error || count);
    } catch (e) {
        console.log('Count error:', e.message);
    }

    // Test 3: Service role key ile test (bypass RLS)
    console.log('\n--- Test 3: Service Role Access ---');
    // Service role key genellikle env'de saklanır ve daha yüksek yetkiler verir
    // Burada sadece kontrol amaçlı yapıyoruz

    // Test 4: Supabase auth admin yetkisiyle
    console.log('\n--- Test 4: Try as Admin User ---');
    try {
        // Admin kullanıcı girişi denemesi
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'webtest_1756989305476@example.com',
            password: 'webtest123456'
        });

        if (signInError) {
            console.log('Admin login failed:', signInError.message);
        } else {
            console.log('✅ Logged in as admin');

            // Şimdi review'leri tekrar deneyelim
            const { data: reviewData, error: reviewError } = await supabase
                .from('review')
                .select(`
                    id,
                    user_id,
                    content_id,
                    text,
                    created_at,
                    app_user!inner (
                        username
                    )
                `)
                .eq('content_id', 6479);

            console.log('Admin reviews result:', reviewError || reviewData);

            // Tüm review'lerin sayısını alalım
            const { count, error: countError } = await supabase
                .from('review')
                .select('*', { count: 'exact', head: true });

            console.log('Total review count as admin:', countError || count);
        }
    } catch (e) {
        console.log('Admin test error:', e.message);
    }

    // Test 5: RLS policies'leri kontrol etmek için SQL query
    console.log('\n--- Test 5: Check RLS Status ---');
    try {
        const { data, error } = await supabase
            .rpc('sql', {
                query: `
                    SELECT schemaname, tablename, rowsecurity 
                    FROM pg_tables 
                    WHERE tablename = 'review';
                `
            });
        console.log('RLS status:', error || data);
    } catch (e) {
        console.log('RLS check error:', e.message);
    }
}

testDirectReviews().catch(console.error);
