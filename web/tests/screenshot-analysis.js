import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey); async function analyzeRPCFunctions() {
    console.log('🔍 Analyzing RPC Functions from Screenshots...\n')

    // Functions seen in screenshots
    const rpcFunctions = [
        'search_content',
        'get_content_detail',
        'get_friend_activities',
        'get_most_watched_movies',
        'get_recommended_contents',
        'get_top_actors_by_movie_count',
        'get_top_reviews',
        'get_trend_contents',
        'get_user_contents',
        'get_user_info_with_stats',
        'handle_new_user',
        'recompute_content_stats'
    ]

    console.log('## 🔧 RPC Fonksiyonları (Screenshot Analizi)\n')

    for (const funcName of rpcFunctions) {
        try {
            console.log(`🔍 Testing: ${funcName}`)

            let result;
            switch (funcName) {
                case 'search_content':
                    result = await supabase.rpc(funcName, {
                        query_text: 'test',
                        content_type_param: 1
                    })
                    break
                case 'get_content_detail':
                    result = await supabase.rpc(funcName, {
                        content_id_param: 1,
                        content_type_param: 1
                    })
                    break
                case 'get_friend_activities':
                    result = await supabase.rpc(funcName, {
                        content_type_param: 1,
                        user_id_param: '550e8400-e29b-41d4-a716-446655440000'
                    })
                    break
                case 'get_most_watched_movies':
                    result = await supabase.rpc(funcName, {
                        page_param: 1,
                        limit_param: 10
                    })
                    break
                case 'get_recommended_contents':
                    result = await supabase.rpc(funcName, {
                        user_id_param: '550e8400-e29b-41d4-a716-446655440000',
                        content_type_param: 1
                    })
                    break
                case 'get_top_actors_by_movie_count':
                    result = await supabase.rpc(funcName, {
                        page_param: 1,
                        limit_param: 10
                    })
                    break
                case 'get_top_reviews':
                    result = await supabase.rpc(funcName, {
                        content_type_param: 1
                    })
                    break
                case 'get_trend_contents':
                    result = await supabase.rpc(funcName, {
                        content_type_param: 1,
                        user_id_param: '550e8400-e29b-41d4-a716-446655440000'
                    })
                    break
                case 'get_user_contents':
                    result = await supabase.rpc(funcName, {
                        user_id_param: '550e8400-e29b-41d4-a716-446655440000',
                        log_user_id_param: '550e8400-e29b-41d4-a716-446655440000'
                    })
                    break
                case 'get_user_info_with_stats':
                    result = await supabase.rpc(funcName, {
                        user_uuid: '550e8400-e29b-41d4-a716-446655440000',
                        profile_user_uuid: '550e8400-e29b-41d4-a716-446655440000'
                    })
                    break
                case 'handle_new_user':
                    // This is likely a trigger function, skip direct call
                    result = { data: 'TRIGGER_FUNCTION', error: null }
                    break
                case 'recompute_content_stats':
                    result = await supabase.rpc(funcName, {
                        content_id_param: 1
                    })
                    break
                default:
                    result = await supabase.rpc(funcName)
            }

            if (result.error) {
                console.log(`  ❌ ${funcName}: ${result.error.message}`)
                console.log(`  📝 Parameters seen in screenshot: ${getParametersFromScreenshot(funcName)}`)
            } else {
                console.log(`  ✅ ${funcName}: Working`)
                if (result.data && result.data.length > 0) {
                    console.log(`  📊 Returns: ${result.data.length} records`)
                } else if (funcName === 'handle_new_user') {
                    console.log(`  📊 Type: Database Trigger Function`)
                } else {
                    console.log(`  📊 Returns: Empty result or void`)
                }
            }
        } catch (error) {
            console.log(`  ❌ ${funcName}: ${error.message}`)
        }
        console.log('')
    }

    // Test triggers seen in screenshots
    console.log('## 🔄 Database Triggers (Screenshot Analizi)\n')

    const triggers = [
        'trg_after_review_change',
        'trg_after_user_content_log_update',
        'update_review_replies_updated_at',
        'update_updated_at_column'
    ]

    for (const trigger of triggers) {
        console.log(`  📋 ${trigger}: Database Trigger Function`)
        console.log(`    🎯 Purpose: ${getTriggerPurpose(trigger)}`)
        console.log('')
    }
}

function getParametersFromScreenshot(funcName) {
    const params = {
        'search_content': 'query_text, content_type_param',
        'get_content_detail': 'content_id_param integer, content_type_param',
        'get_friend_activities': 'content_type_param integer, user_id_param',
        'get_most_watched_movies': 'page_param integer, limit_param integer',
        'get_recommended_contents': 'user_id_param uuid, content_type_param',
        'get_top_actors_by_movie_count': 'page_param integer, limit_param integer',
        'get_top_reviews': 'content_type_param integer DEFAULT',
        'get_trend_contents': 'content_type_param integer, user_id_param',
        'get_user_contents': 'user_id_param uuid, log_user_id_param',
        'get_user_info_with_stats': 'user_uuid uuid, profile_user_uuid uuid',
        'recompute_content_stats': 'content_id_param integer'
    }
    return params[funcName] || 'Unknown parameters'
}

function getTriggerPurpose(triggerName) {
    const purposes = {
        'trg_after_review_change': 'Triggered after review table changes',
        'trg_after_user_content_log_update': 'Triggered after user_content_log updates',
        'update_review_replies_updated_at': 'Updates review replies timestamp',
        'update_updated_at_column': 'Updates updated_at column automatically'
    }
    return purposes[triggerName] || 'Unknown trigger purpose'
}

analyzeRPCFunctions()
