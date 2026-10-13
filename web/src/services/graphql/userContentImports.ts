import { gql } from '@apollo/client';

export const IMPORT_LETTERBOXD_DATA = gql`
  mutation ImportLetterboxdData($csvData: LetterboxdCsvInput!, $testLimit: Int) {
    importLetterboxdData(csvData: $csvData, testLimit: $testLimit) {
      success
      totalMovies
      matchedMovies
      ratingsImported
      watchedImported
      watchlistImported
      reviewsImported
      listsImported
      unmatchedMovies
      errors
      message
      jobId
    }
  }
`;

export interface LetterboxdImportResult {
  success: boolean;
  jobId?: string;
  totalMovies: number;
  matchedMovies: number;
  ratingsImported: number;
  watchedImported: number;
  watchlistImported: number;
  reviewsImported: number;
  listsImported: number;
  unmatchedMovies: string[];
  errors: string[];
  message?: string;
}

export interface ImportLetterboxdData {
  importLetterboxdData: LetterboxdImportResult;
}

export const GET_IMPORT_JOB_STATUS = gql`
  query GetImportJobStatus($jobId: String!) {
    getImportJobStatus(jobId: $jobId) {
      id
      status
      totalItems
      processedItems
      errors
      currentItem
    }
  }
`;

export const GET_ACTIVE_IMPORT_JOB = gql`
  query GetActiveImportJob {
    getActiveImportJob {
      id
      status
      totalItems
      processedItems
      errors
      currentItem
    }
  }
`;

export const CANCEL_IMPORT_JOB = gql`
  mutation CancelImportJob($jobId: String!) {
    cancelImportJob(jobId: $jobId)
  }
`;

export interface ImportJobStatus {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  errors: string[];
  currentItem?: string;
}

export interface GetImportJobStatusData {
  getImportJobStatus: ImportJobStatus | null;
}

export interface GetActiveImportJobData {
  getActiveImportJob: ImportJobStatus | null;
}

// ==========================================
// CSV IMPORT (Games & Series)
// ==========================================

export const IMPORT_CSV_DATA = gql`
  mutation ImportCsvData($csvContent: String!, $contentType: String!, $testLimit: Int) {
    importCsvData(csvContent: $csvContent, contentType: $contentType, testLimit: $testLimit) {
      success
      totalItems
      matchedItems
      logsCreated
      ratingsImported
      unmatchedItems
      errors
      message
      jobId
    }
  }
`;

export interface CsvImportResult {
  success: boolean;
  jobId?: string;
  totalItems: number;
  matchedItems: number;
  logsCreated: number;
  ratingsImported: number;
  unmatchedItems: string[];
  errors: string[];
  message?: string;
}

export interface ImportCsvData {
  importCsvData: CsvImportResult;
}
