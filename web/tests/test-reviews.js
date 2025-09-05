import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testReviews() {
    console.log('🔍 Testing review visibility...');

    try {
        // Test without authentication
        console.log('\n📋 Testing anonymous access...');
        const { data: anonymousReviews, error: anonError } = await supabase
            .from('review')
            .select(`
                id,
                text,
                created_at,
                user_id,
                content_id,
                app_user!inner (
                    username
                )
            `)
            .limit(10);

        if (anonError) {
            console.log('❌ Anonymous review access:', anonError.message);
        } else {
            console.log(`✅ Anonymous can see ${anonymousReviews.length} reviews`);
            if (anonymousReviews.length > 0) {
                console.log('   Sample users:', [...new Set(anonymousReviews.map(r => r.app_user?.username))]);
            }
        }

        // Test with authentication
        console.log('\n🔐 Testing with user authentication...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'webtest_1756989305476@example.com',
            password: 'webtest123456'
        });

        if (authError) {
            console.log('❌ Authentication failed:', authError.message);
            return;
        }

        console.log('✅ Authenticated as:', authData.user?.email);

        const { data: authReviews, error: authReviewError } = await supabase
            .from('review')
            .select(`
                id,
                text,
                created_at,
                user_id,
                content_id,
                app_user!inner (
                    username
                )
            `)
            .limit(10);

        if (authReviewError) {
            console.log('❌ Authenticated review access:', authReviewError.message);
        } else {
            console.log(`✅ Authenticated user can see ${authReviews.length} reviews`);
            if (authReviews.length > 0) {
                console.log('   Sample users:', [...new Set(authReviews.map(r => r.app_user?.username))]);
                console.log('   Current user ID:', authData.user?.id);
                console.log('   Reviews by current user:', authReviews.filter(r => r.user_id === authData.user?.id).length);
                console.log('   Reviews by others:', authReviews.filter(r => r.user_id !== authData.user?.id).length);
            }
        }

        // Test specific movie reviews (content_id 6479)
        console.log('\n🎬 Testing content_id 6479 reviews...');
        const { data: targetReviews, error: targetError } = await supabase
            .from('review')
            .select(`
                id,
                text,
                created_at,
                user_id,
                content_id,
                app_user!inner (
                    username
                )
            `)
            .eq('content_id', 6479);

        if (targetError) {
            console.log('❌ Content 6479 reviews:', targetError.message);
        } else {
            console.log(`✅ Content 6479 has ${targetReviews.length} reviews`);
            if (targetReviews.length > 0) {
                console.log('   Reviews details:');
                targetReviews.forEach((review, index) => {
                    console.log(`   ${index + 1}. User: ${review.app_user?.username}, Text: "${review.text.substring(0, 50)}..."`);
                    console.log(`      User ID: ${review.user_id}, Review ID: ${review.id}`);
                });
                console.log('   Current user ID:', authData.user?.id);
                console.log('   Reviews by current user:', targetReviews.filter(r => r.user_id === authData.user?.id).length);
                console.log('   Reviews by others:', targetReviews.filter(r => r.user_id !== authData.user?.id).length);
            }
        }

        // Test specific movie reviews
        console.log('\n🎬 Testing other movie reviews...');

        // Get a movie ID with reviews
        const { data: contentData } = await supabase
            .from('content')
            .select('id, title')
            .limit(5);

        if (contentData && contentData.length > 0) {
            for (const content of contentData) {
                const { data: movieReviews, error: movieError } = await supabase
                    .from('review')
                    .select(`
                        id,
                        text,
                        user_id,
                        app_user!inner (
                            username
                        )
                    `)
                    .eq('content_id', content.id);

                if (movieError) {
                    console.log(`❌ Movie ${content.id} (${content.title}) reviews:`, movieError.message);
                } else {
                    console.log(`🎬 Movie ${content.id} (${content.title}): ${movieReviews.length} reviews`);
                    if (movieReviews.length > 0) {
                        console.log(`   Users: ${[...new Set(movieReviews.map(r => r.app_user?.username))].join(', ')}`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testReviews();
