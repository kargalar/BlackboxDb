import { gql } from '@apollo/client';

export const GET_REPORTS = gql`
  query GetReports($status: String, $limit: Int) {
    getReports(status: $status, limit: $limit) {
      id
      targetType
      targetId
      reason
      status
      createdAt
      reporterId
      reporter {
        id
        username
        picturePath
      }
    }
  }
`;

export const UPDATE_REPORT_STATUS = gql`
  mutation UpdateReportStatus($reportId: Int!, $status: String!) {
    updateReportStatus(reportId: $reportId, status: $status) {
      id
      status
    }
  }
`;
