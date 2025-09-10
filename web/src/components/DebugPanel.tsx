'use client';

import React, { useState, useEffect } from 'react';
import { getRequestCounts } from '@/lib/requestLogger';

const DebugPanel: React.FC = () => {
  const [counts, setCounts] = useState(getRequestCounts());

  useEffect(() => {
    const interval = setInterval(() => {
      setCounts(getRequestCounts());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded shadow-lg z-50">
      <h3 className="text-lg font-bold mb-2">Debug Info</h3>
      <p>API Requests: {counts.apiRequests}</p>
      <p>Supabase Requests: {counts.supabaseRequests}</p>
    </div>
  );
};

export default DebugPanel;
