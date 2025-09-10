// Request Logger for API and Supabase requests
// Tracks and logs the number of requests made

let apiRequestCount = 0;
let supabaseRequestCount = 0;

interface LogEntry {
  id: number;
  type: 'api' | 'supabase';
  endpoint: string;
  operation: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

const logs: LogEntry[] = [];
let logId = 1;

export function logApiRequest(endpoint: string, method: string = 'GET', success: boolean = true, error?: string) {
  apiRequestCount++;
  const entry: LogEntry = {
    id: logId++,
    type: 'api',
    endpoint,
    operation: method,
    success,
    timestamp: new Date(),
    error
  };
  logs.push(entry);
  console.log(`[DEBUG] API Request #${apiRequestCount}: ${method} ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'}`);
  if (!success && error) console.error(`[DEBUG] Error: ${error}`);
}

export function logSupabaseRequest(table: string, operation: string, success: boolean = true, error?: string) {
  supabaseRequestCount++;
  const entry: LogEntry = {
    id: logId++,
    type: 'supabase',
    endpoint: table,
    operation,
    success,
    timestamp: new Date(),
    error
  };
  logs.push(entry);
  console.log(`[DEBUG] Supabase Request #${supabaseRequestCount}: ${operation} on ${table} - ${success ? 'SUCCESS' : 'FAILED'}`);
  if (!success && error) console.error(`[DEBUG] Error: ${error}`);
}

export function getRequestCounts() {
  return {
    apiRequests: apiRequestCount,
    supabaseRequests: supabaseRequestCount,
  };
}

export function getLogs() {
  return logs.slice(-100); // Last 100 logs
}

export function resetRequestCounts() {
  apiRequestCount = 0;
  supabaseRequestCount = 0;
  logs.length = 0; // Clear logs
  console.log('[DEBUG] Request counts and logs reset');
}
