import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test follow functionality
async function testFollowFunctionality() {
    try {
        console.log('🔍 Testing follow functionality...');

        // First, let's check if user_follow table exists and has correct structure
        console.log('\n📋 Checking user_follow table structure...');
        const { data: followData, error: followError } = await supabase
            .from('user_follow')
            .select('*')
            .limit(1);

        if (followError) {
            console.log('❌ user_follow table error:', followError.message);
            return;
        }

        console.log('✅ user_follow table accessible');
        if (followData && followData.length > 0) {
            console.log('   Sample columns:', Object.keys(followData[0]).join(', '));
        }

        // Test get_user_info_with_stats function
        console.log('\n🔍 Testing get_user_info_with_stats function...');
        const testUserId = '283d293a-1802-49bf-a4dc-be80043a6337'; // From schema
        const { data: userInfo, error: userInfoError } = await supabase.rpc('get_user_info_with_stats', {
            user_uuid: testUserId,
            profile_user_uuid: testUserId
        });

        if (userInfoError) {
            console.log('❌ get_user_info_with_stats error:', userInfoError.message);
        } else {
            console.log('✅ get_user_info_with_stats works');
            console.log('   Result:', userInfo);
        }

        // Test follow/unfollow operations (requires authentication)
        console.log('\n🔍 Testing follow operations (requires auth)...');

        // Check current auth status
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.log('⚠️  Not authenticated - cannot test follow/unfollow operations');
            console.log('   Please run this test after logging in');
            return;
        }

        console.log('✅ Authenticated as:', user.email);

        // Test follow operation
        console.log('\n🔍 Testing follow operation...');
        const { error: insertError } = await supabase
            .from('user_follow')
            .insert({
                user_id: user.id,
                following_user_id: testUserId,
            });

        if (insertError) {
            console.log('❌ Follow insert error:', insertError.message);
        } else {
            console.log('✅ Follow operation successful');
        }

        // Test unfollow operation
        console.log('\n🔍 Testing unfollow operation...');
        const { error: deleteError } = await supabase
            .from('user_follow')
            .delete()
            .eq('user_id', user.id)
            .eq('following_user_id', testUserId);

        if (deleteError) {
            console.log('❌ Unfollow delete error:', deleteError.message);
        } else {
            console.log('✅ Unfollow operation successful');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testFollowFunctionality();
