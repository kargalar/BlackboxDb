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

// Window-specific counters using sessionStorage
const WINDOW_API_KEY = 'blackbox_window_api_requests';
const WINDOW_SUPABASE_KEY = 'blackbox_window_supabase_requests';

function getWindowApiCount(): number {
  if (typeof window === 'undefined') return 0;
  const stored = sessionStorage.getItem(WINDOW_API_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function getWindowSupabaseCount(): number {
  if (typeof window === 'undefined') return 0;
  const stored = sessionStorage.getItem(WINDOW_SUPABASE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function incrementWindowApiCount(): void {
  if (typeof window === 'undefined') return;
  const current = getWindowApiCount();
  sessionStorage.setItem(WINDOW_API_KEY, (current + 1).toString());
}

function incrementWindowSupabaseCount(): void {
  if (typeof window === 'undefined') return;
  const current = getWindowSupabaseCount();
  sessionStorage.setItem(WINDOW_SUPABASE_KEY, (current + 1).toString());
}

export function logApiRequest(endpoint: string, method: string = 'GET', success: boolean = true, error?: string) {
  apiRequestCount++;
  incrementWindowApiCount();
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
  incrementWindowSupabaseCount();
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

export function getWindowRequestCounts() {
  return {
    apiRequests: getWindowApiCount(),
    supabaseRequests: getWindowSupabaseCount(),
  };
}

export function getLogs() {
  return logs.slice(-100); // Last 100 logs
}

export function resetRequestCounts() {
  apiRequestCount = 0;
  supabaseRequestCount = 0;
  logs.length = 0; // Clear logs
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(WINDOW_API_KEY);
    sessionStorage.removeItem(WINDOW_SUPABASE_KEY);
  }
  console.log('[DEBUG] Request counts and logs reset');
}
