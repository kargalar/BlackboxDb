'use client';

import { useState, useCallback } from 'react';
import { apolloClient } from '@/lib/apollo-client';
import { IMPORT_CSV_DATA, ImportCsvData, CsvImportResult } from '@/services/graphql/userContent';

type ImportPhase = 'idle' | 'reading' | 'processing' | 'done' | 'error';
type UiImportPhase = ImportPhase | 'queued';

interface ImportState {
  phase: UiImportPhase;
  progress: string;
  result: CsvImportResult | null;
  error: string | null;
}

/**
 * CSV import hook for games and series
 * CSV dosyasını okuyup backend'e gönderir
 */
export function useCsvImport() {
  const [state, setState] = useState<ImportState>({
    phase: 'idle',
    progress: '',
    result: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({ phase: 'idle', progress: '', result: null, error: null });
  }, []);

  const importCsv = useCallback(
    async (file: File, contentType: 'game' | 'series', testLimit?: number) => {
      setState({
        phase: 'reading',
        progress: 'CSV dosyası okunuyor...',
        result: null,
        error: null,
      });
      console.log(`📄 [CsvImport] Reading CSV file: ${file.name}, type=${contentType}`);

      try {
        // 1. Read file content
        const csvContent = await file.text();
        console.log(`📄 [CsvImport] CSV content: ${csvContent.length} chars`);

        if (!csvContent || csvContent.trim().length === 0) {
          throw new Error('CSV dosyası boş.');
        }

        // 2. Send to backend
        setState({
          phase: 'processing',
          progress: `${contentType === 'game' ? 'Oyunlar IGDB' : 'Diziler TMDB'} ile eşleştiriliyor... Bu işlem birkaç dakika sürebilir.`,
          result: null,
          error: null,
        });
        console.log('📤 [CsvImport] Sending CSV data to server...');

        const { data } = await apolloClient.mutate<ImportCsvData>({
          mutation: IMPORT_CSV_DATA,
          variables: {
            csvContent,
            contentType,
            ...(testLimit ? { testLimit } : {}),
          },
          fetchPolicy: 'no-cache',
        });

        if (data?.importCsvData) {
          const result = data.importCsvData;
          console.log('✅ [CsvImport] Import completed:', result);

          setState({
            phase: result.success && result.jobId ? 'queued' : result.success ? 'done' : 'error',
            progress: '',
            result,
            error: result.success ? null : result.message || 'Import başarısız oldu',
          });
        } else {
          throw new Error('Sunucudan beklenmeyen yanıt alındı.');
        }
      } catch (error: any) {
        console.error('❌ [CsvImport] Error:', error);
        setState({
          phase: 'error',
          progress: '',
          result: null,
          error: error.message || 'Import işlemi başarısız oldu.',
        });
      }
    },
    []
  );

  return { state, importCsv, reset };
}
