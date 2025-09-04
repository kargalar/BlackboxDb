import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxqbvdienivjgkferaxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWJ2ZGllbml2amdrZmVyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzk5NjMsImV4cCI6MjA2OTgxNTk2M30.OzQPYe-3qm1eK-uvY2HlQd9HJw-Ujv-FvJeAp3-0Uas';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Extract complete database schema
async function extractDatabaseSchema() {
    console.log('🔍 Extracting complete database schema...');

    const schema = {
        tables: [],
        functions: [],
        views: [],
        enums: []
    };

    // First, sign in with a test user to get better access
    try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'webtest_1756989305476@example.com',
            password: 'webtest123456'
        });

        if (signInError) {
            console.log('⚠️ Could not sign in, using anonymous access');
        } else {
            console.log('✅ Signed in for schema extraction');
        }
    } catch (e) {
        console.log('⚠️ Authentication failed, using anonymous access');
    }

    // Get list of tables we can access
    const knownTables = [
        'app_user',
        'content',
        'user_content_log',
        'review',
        'content_type',
        'content_status',
        'g_genre',
        'g_platform',
        'x_game_platform',
        'x_content_genre',
        'user_follow',
        'latest_user_content_log',
        'friend_activity'
    ];

    console.log('📋 Analyzing tables...');

    for (const tableName of knownTables) {
        try {
            console.log(`\n🔍 Analyzing table: ${tableName}`);

            // Get sample data to understand column structure
            const { data: sampleData, error: sampleError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);

            if (sampleError) {
                console.log(`  ❌ Cannot access ${tableName}:`, sampleError.message);
                continue;
            }

            // Get row count
            const { count, error: countError } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });

            const rowCount = countError ? 'Unknown' : count;

            let columns = [];
            let sampleRecord = null;

            if (sampleData && sampleData.length > 0) {
                sampleRecord = sampleData[0];
                columns = Object.keys(sampleRecord).map(key => ({
                    name: key,
                    type: inferType(sampleRecord[key]),
                    sample_value: sampleRecord[key]
                }));
            }

            schema.tables.push({
                name: tableName,
                row_count: rowCount,
                columns: columns,
                sample_record: sampleRecord
            });

            console.log(`  ✅ ${tableName}: ${rowCount} rows, ${columns.length} columns`);

        } catch (e) {
            console.log(`  ❌ Error analyzing ${tableName}:`, e.message);
        }
    }

    // Try to get RPC functions
    console.log('\n📋 Testing known RPC functions...');

    const knownFunctions = [
        'get_user_contents',
        'get_content_detail',
        'search_content',
        'get_trend_contents',
        'get_recommended_contents',
        'get_friend_activities',
        'get_user_info_with_stats',
        'recompute_content_stats'
    ];

    for (const funcName of knownFunctions) {
        try {
            // Try calling with dummy params to see if function exists
            const testParams = {
                user_id_param: '00000000-0000-0000-0000-000000000000',
                content_id_param: 1,
                content_type_param: 1,
                log_user_id_param: '00000000-0000-0000-0000-000000000000',
                page_param: 1,
                limit_param: 1,
                search_query: 'test',
                user_uuid: '00000000-0000-0000-0000-000000000000',
                profile_user_uuid: '00000000-0000-0000-0000-000000000000'
            };

            const { error } = await supabase.rpc(funcName, testParams);

            if (error) {
                if (error.code === '42883') {
                    console.log(`  ❌ ${funcName}: Function does not exist`);
                } else {
                    console.log(`  ✅ ${funcName}: Function exists (${error.message})`);
                    schema.functions.push({
                        name: funcName,
                        status: 'exists',
                        error_hint: error.message
                    });
                }
            } else {
                console.log(`  ✅ ${funcName}: Function works`);
                schema.functions.push({
                    name: funcName,
                    status: 'working'
                });
            }
        } catch (e) {
            console.log(`  ❌ ${funcName}: Error testing function`);
        }
    }

    // Sign out
    await supabase.auth.signOut();

    return schema;
}

// Helper function to infer PostgreSQL type from JavaScript value
function inferType(value) {
    if (value === null) return 'nullable';
    if (typeof value === 'string') {
        // Check if it's a UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            return 'uuid';
        }
        // Check if it's a timestamp
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            return 'timestamp with time zone';
        }
        return 'text/varchar';
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'integer' : 'numeric';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'json/jsonb';
    return 'unknown';
}

// Generate markdown documentation
function generateMarkdownDoc(schema) {
    let markdown = `# BlackboxDb Database Schema\n\n`;
    markdown += `*Generated on: ${new Date().toISOString()}*\n\n`;

    // Tables section
    markdown += `## Tables\n\n`;

    for (const table of schema.tables) {
        markdown += `### ${table.name}\n\n`;
        markdown += `- **Row Count**: ${table.row_count}\n`;
        markdown += `- **Columns**: ${table.columns.length}\n\n`;

        if (table.columns.length > 0) {
            markdown += `| Column Name | Data Type | Sample Value |\n`;
            markdown += `|-------------|-----------|---------------|\n`;

            for (const col of table.columns) {
                const sampleValue = col.sample_value === null ? 'NULL' :
                    typeof col.sample_value === 'string' ? `"${col.sample_value}"` :
                        JSON.stringify(col.sample_value);
                markdown += `| ${col.name} | ${col.type} | ${sampleValue} |\n`;
            }
            markdown += '\n';
        }
    }

    // Functions section
    if (schema.functions.length > 0) {
        markdown += `## RPC Functions\n\n`;

        for (const func of schema.functions) {
            markdown += `- **${func.name}**: ${func.status}`;
            if (func.error_hint) {
                markdown += ` (${func.error_hint})`;
            }
            markdown += '\n';
        }
        markdown += '\n';
    }

    return markdown;
}

// Main execution
async function main() {
    try {
        const schema = await extractDatabaseSchema();

        console.log('\n📝 Generating documentation...');
        const markdown = generateMarkdownDoc(schema);

        console.log('\n📄 Database Schema Documentation:');
        console.log('=====================================');
        console.log(markdown);

        // Also output as JSON for reference
        console.log('\n🔧 JSON Schema (for reference):');
        console.log(JSON.stringify(schema, null, 2));

    } catch (error) {
        console.error('❌ Schema extraction failed:', error);
    }
}

main();
