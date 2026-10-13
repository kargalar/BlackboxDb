// Request Logger for API requests
// Tracks and logs the number of requests made

let apiRequestCount = 0;
let graphqlRequestCount = 0;

interface LogEntry {
  id: number;
  type: 'api' | 'graphql' | 'ui';
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

function getWindowApiCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = sessionStorage.getItem(WINDOW_API_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function incrementWindowApiCount(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getWindowApiCount();
    sessionStorage.setItem(WINDOW_API_KEY, (current + 1).toString());
  } catch (error) {
    console.warn('Failed to increment window API count:', error);
  }
}

export function logApiRequest(
  endpoint: string,
  method: string = 'GET',
  success: boolean = true,
  error?: string
) {
  apiRequestCount++;
  incrementWindowApiCount();
  const entry: LogEntry = {
    id: logId++,
    type: 'api',
    endpoint,
    operation: method,
    success,
    timestamp: new Date(),
    error,
  };
  logs.push(entry);
  console.log(
    `[DEBUG] API Request #${apiRequestCount}: ${method} ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'}`
  );
  if (!success && error) console.error(`[DEBUG] Error: ${error}`);
}

export function logGraphqlRequest(operation: string, success: boolean = true, error?: string) {
  graphqlRequestCount++;
  const entry: LogEntry = {
    id: logId++,
    type: 'graphql',
    endpoint: 'GraphQL',
    operation,
    success,
    timestamp: new Date(),
    error,
  };
  logs.push(entry);
  console.log(
    `[DEBUG] GraphQL Request #${graphqlRequestCount}: ${operation} - ${success ? 'SUCCESS' : 'FAILED'}`
  );
  if (!success && error) console.error(`[DEBUG] GraphQL Error: ${error}`);
}

export function logUiEvent(operation: string, success: boolean = true, error?: string) {
  const entry: LogEntry = {
    id: logId++,
    type: 'ui',
    endpoint: 'UI',
    operation,
    success,
    timestamp: new Date(),
    error,
  };
  logs.push(entry);
  console.log(`[DEBUG] UI Event: ${operation} - ${success ? 'SUCCESS' : 'FAILED'}`);
  if (!success && error) console.error(`[DEBUG] UI Error: ${error}`);
}

export function getRequestCounts() {
  return {
    apiRequests: apiRequestCount,
    graphqlRequests: graphqlRequestCount,
  };
}

export function getWindowRequestCounts() {
  return {
    apiRequests: getWindowApiCount(),
  };
}

export function getLogs() {
  return logs.slice(-100); // Last 100 logs
}

export function clearLogs() {
  logs.length = 0;
  console.log('[DEBUG] Logs cleared');
}

export function resetRequestCounts() {
  apiRequestCount = 0;
  logs.length = 0; // Clear logs
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(WINDOW_API_KEY);
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }
  console.log('[DEBUG] Request counts and logs reset');
}

// Helper functions for copying logs
export function formatLogForClipboard(log: LogEntry): string {
  const timeString = log.timestamp.toISOString().replace('T', ' ').slice(0, -1); // Remove 'Z' and replace 'T'
  return `[${timeString}] ${log.type.toUpperCase()} - ${log.operation} ${log.endpoint}${log.error ? `\nError: ${log.error}` : ''}`;
}

export function formatAllLogsForClipboard(logsToFormat: LogEntry[]): string {
  return logsToFormat.map((log) => formatLogForClipboard(log)).join('\n\n');
}

export function formatLogsAsJSON(logsToFormat: LogEntry[]): string {
  return JSON.stringify(logsToFormat, null, 2);
}
