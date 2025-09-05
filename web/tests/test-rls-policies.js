import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSPolicies() {
    console.log('🔍 Testing RLS Policies for Reviews...');

    try {
        // Test 1: Login as first user
        console.log('\n--- Test 1: Login as User 1 ---');
        const { data: loginData1, error: loginError1 } = await supabase.auth.signInWithPassword({
            email: 'webtest_1756989305476@example.com',
            password: 'webtest123456'
        });

        if (loginError1) {
            console.log('❌ Login failed:', loginError1.message);
            return;
        }

        console.log('✅ User 1 logged in:', loginData1.user?.email);

        // Get reviews as User 1
        const { data: reviewsUser1, error: reviewsError1 } = await supabase
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
            `);

        console.log('📝 Reviews visible to User 1:', reviewsUser1?.length || 0);
        if (reviewsUser1) {
            reviewsUser1.forEach(review => {
                console.log(`  - Review ${review.id}: "${review.text?.substring(0, 50)}..." by ${review.app_user?.username}`);
            });
        }

        // Sign out User 1
        await supabase.auth.signOut();

        // Test 2: Login as second user (if exists)
        console.log('\n--- Test 2: Create and login as User 2 ---');

        // Try to create second user
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: 'testuser2@example.com',
            password: 'testpass123'
        });

        if (signupError) {
            console.log('⚠️ Signup failed (might already exist):', signupError.message);

            // Try to login instead
            const { data: loginData2, error: loginError2 } = await supabase.auth.signInWithPassword({
                email: 'testuser2@example.com',
                password: 'testpass123'
            });

            if (loginError2) {
                console.log('❌ User 2 login failed:', loginError2.message);
                return;
            }
            console.log('✅ User 2 logged in:', loginData2.user?.email);
        } else {
            console.log('✅ User 2 created and logged in:', signupData.user?.email);
        }

        // Create app_user record for User 2 if needed
        const { data: currentUser } = await supabase.auth.getUser();
        if (currentUser.user) {
            const { data: existingAppUser } = await supabase
                .from('app_user')
                .select('*')
                .eq('auth_user_id', currentUser.user.id)
                .maybeSingle();

            if (!existingAppUser) {
                const { error: appUserError } = await supabase
                    .from('app_user')
                    .insert({
                        auth_user_id: currentUser.user.id,
                        username: 'testuser2',
                        email: 'testuser2@example.com',
                        bio: null,
                        picture_path: null,
                        personality_analyze: null
                    });

                if (appUserError) {
                    console.log('⚠️ Failed to create app_user for User 2:', appUserError.message);
                } else {
                    console.log('✅ Created app_user for User 2');
                }
            }
        }

        // Get reviews as User 2
        const { data: reviewsUser2, error: reviewsError2 } = await supabase
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
            `);

        console.log('📝 Reviews visible to User 2:', reviewsUser2?.length || 0);
        if (reviewsUser2) {
            reviewsUser2.forEach(review => {
                console.log(`  - Review ${review.id}: "${review.text?.substring(0, 50)}..." by ${review.app_user?.username}`);
            });
        }

        // Test 3: Anonymous access (no login)
        console.log('\n--- Test 3: Anonymous Access ---');
        await supabase.auth.signOut();

        const { data: reviewsAnon, error: reviewsErrorAnon } = await supabase
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
            `);

        console.log('📝 Reviews visible to anonymous user:', reviewsAnon?.length || 0);
        if (reviewsAnon) {
            reviewsAnon.forEach(review => {
                console.log(`  - Review ${review.id}: "${review.text?.substring(0, 50)}..." by ${review.app_user?.username}`);
            });
        }

        // Test 4: Check specific content reviews
        console.log('\n--- Test 4: Test specific content reviews ---');

        // Login back as User 1
        await supabase.auth.signInWithPassword({
            email: 'webtest_1756989305476@example.com',
            password: 'webtest123456'
        });

        // Get reviews for a specific movie (let's use content_id = 1)
        const { data: specificReviews, error: specificError } = await supabase
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
            .eq('content_id', 1); // Assuming content_id 1 exists

        console.log('📝 Reviews for content_id=1:', specificReviews?.length || 0);
        if (specificReviews) {
            specificReviews.forEach(review => {
                console.log(`  - Review ${review.id}: "${review.text?.substring(0, 50)}..." by ${review.app_user?.username} (user_id: ${review.user_id})`);
            });
        }

        // Test 5: Check RLS policies directly
        console.log('\n--- Test 5: Check RLS Policies ---');
        try {
            const { data: policies, error: policiesError } = await supabase
                .rpc('pg_policies')
                .select('*');

            if (policiesError) {
                console.log('⚠️ Cannot check policies directly:', policiesError.message);
            } else {
                console.log('📋 Found', policies?.length || 0, 'policies');
            }
        } catch (e) {
            console.log('⚠️ Cannot check RLS policies:', e.message);
        }

        console.log('\n🔍 Analysis Complete!');

    } catch (error) {
        console.error('❌ Error during RLS test:', error);
    }
}

testRLSPolicies();
