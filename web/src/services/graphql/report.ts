import { gql } from '@apollo/client';

export const CREATE_REPORT = gql`
  mutation CreateReport($targetType: String!, $targetId: String!, $reason: String!) {
    createReport(targetType: $targetType, targetId: $targetId, reason: $reason) {
      id
      status
      createdAt
    }
  }
`;

export const GET_CONTENT_REPORTS = gql`
  query GetContentReports {
    getContentReports {
      report {
        id
        reason
        status
        createdAt
        targetId
      }
      contentTitle
      reporterUsername
    }
  }
`;

export const REVIEW_CONTENT_REPORTS = gql`
  mutation ReviewContentReports($targetId: String!, $status: String!, $reason: String) {
    reviewContentReports(targetId: $targetId, status: $status, reason: $reason)
  }
`;
