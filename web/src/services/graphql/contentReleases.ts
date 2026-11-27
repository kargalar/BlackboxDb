import { gql } from '@apollo/client';

export const GET_CONTENT_RELEASES = gql`
  query ContentReleases($id: String!) {
    contentReleases(id: $id) {
      regionCode
      date
    }
  }
`;

export const FETCH_PROVIDER_RELEASES = gql`
  query FetchProviderReleases($source: String!, $sourceId: String!) {
    fetchProviderReleases(source: $source, sourceId: $sourceId) {
      regionCode
      date
    }
  }
`;
