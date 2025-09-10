// Debug script to check games in database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGames() {
    console.log('Checking games in content table...');

    // Check content table for games
    const { data: games, error: gamesError } = await supabase
        .from('content')
        .select('*')
        .eq('content_type_id', 5) // 5 = Games
        .limit(5);

    console.log('Games in content table:', games);
    if (gamesError) console.log('Games error:', gamesError);

    // Check user_content_log for games
    const { data: logs, error: logsError } = await supabase
        .from('user_content_log')
        .select(`
      *,
      content:content_id (
        id,
        title,
        content_type_id,
        poster_path
      )
    `)
        .limit(10);

    console.log('All logs:', logs);
    if (logsError) console.log('Logs error:', logsError);

    // Check game logs specifically
    const gameLogs = logs?.filter(log => log.content?.content_type_id === 5);
    console.log('Game logs:', gameLogs);

    // Check latest_user_content_log view
    const { data: latest, error: latestError } = await supabase
        .from('latest_user_content_log')
        .select(`
      *,
      content:content_id (
        id,
        title,
        content_type_id,
        poster_path
      )
    `)
        .limit(10);

    console.log('Latest logs:', latest);
    if (latestError) console.log('Latest error:', latestError);

    const latestGameLogs = latest?.filter(log => log.content?.content_type_id === 5);
    console.log('Latest game logs:', latestGameLogs);

    // Check specific content titles
    const { data: contentTitles, error: contentError } = await supabase
        .from('content')
        .select('id, title, content_type_id, poster_path')
        .in('id', [1877, 8533, 119177, 152362]) // IDs from the logs above
        .limit(10);

    console.log('Content titles check:', contentTitles);
    if (contentError) console.log('Content error:', contentError);
}

debugGames().catch(console.error);
