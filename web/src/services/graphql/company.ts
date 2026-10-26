import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';

// ==========================================
// COMPANY FRAGMENTS
// ==========================================

export const COMPANY_FIELDS = gql`
  fragment CompanyFields on CompanyType {
    id
    name
    description
    headquarters
    logoUrl
    foundingYear
    contentCount
    defaultRoleIds
  }
`;

export const COMPANY_CONTENT_FIELDS = gql`
  fragment CompanyContentFields on CompanyContentType {
    contentId
    contentTitle
    contentType
    posterUrl
    ratingDistribution
    tmdbRating
    releaseDate
    companyRoleId
    userStatus {
      isConsumed
      isFavorite
      isConsumeLater
      isContinuing
      rating
      consumedDate
      consumeLaterDate
    }
    popularity
  }
`;

// ==========================================
// QUERIES
// ==========================================

export const GET_COMPANY = gql`
  query GetCompany($id: String!) {
    company(id: $id) {
      ...CompanyFields
    }
  }
  ${COMPANY_FIELDS}
`;

export const GET_COMPANY_CONTENTS = gql`
  query GetCompanyContents($companyId: String!, $companyRoleId: Int, $limit: Int) {
    companyContents(companyId: $companyId, companyRoleId: $companyRoleId, limit: $limit) {
      ...CompanyContentFields
    }
  }
  ${COMPANY_CONTENT_FIELDS}
`;

export const SEARCH_COMPANIES = gql`
  query SearchCompanies($name: String!, $limit: Int) {
    searchCompanies(name: $name, limit: $limit) {
      ...CompanyFields
    }
  }
  ${COMPANY_FIELDS}
`;

export const EXPLORE_COMPANIES = gql`
  query ExploreCompanies(
    $search: String
    $page: Int
    $limit: Int
    $sortBy: String
    $sortOrder: String
    $minYear: Int
    $maxYear: Int
    $minContentCount: Int
    $maxContentCount: Int
    $roles: [Int!]
  ) {
    exploreCompanies(
      search: $search
      page: $page
      limit: $limit
      sortBy: $sortBy
      sortOrder: $sortOrder
      minYear: $minYear
      maxYear: $maxYear
      minContentCount: $minContentCount
      maxContentCount: $maxContentCount
      roles: $roles
    ) {
      totalCount
      items {
        id
        name
        description
        headquarters
        logoUrl
        website
        foundingYear
        defaultRoleIds
        createdAt
        contentCount
      }
    }
  }
`;

// ==========================================
// TYPESCRIPT INTERFACES
// ==========================================

export interface CompanyData {
  id: string;
  name: string;
  description?: string;
  headquarters?: string;
  logoUrl?: string;
  website?: string;
  foundingYear?: number;
  contentCount: number;
  defaultRoleIds?: number[];
}

export interface CompanyContentData {
  contentId: string;
  contentTitle: string;
  contentType?: string;
  posterUrl?: string;
  ratingDistribution?: number[];
  tmdbRating?: number | null;
  releaseDate?: string;
  companyRoleId?: number;
  userStatus?: {
    isConsumed: boolean;
    isFavorite: boolean;
    isConsumeLater: boolean;
    isContinuing: boolean;
    rating: number | null;
    consumedDate?: string | null;
    consumeLaterDate?: string | null;
  } | null;
  popularity?: number;
}

// ==========================================
// SERVICE FUNCTIONS
// ==========================================

export async function exploreCompanies(params: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  minYear?: number;
  maxYear?: number;
  minContentCount?: number;
  maxContentCount?: number;
  roles?: number[];
}) {
  try {
    const { data, error } = await apolloClient.query<{
      exploreCompanies: { items: CompanyData[]; totalCount: number };
    }>({
      query: EXPLORE_COMPANIES,
      variables: params,
      fetchPolicy: 'network-only',
    });
    if (error || !data) {
      throw new Error(error?.message || 'Explore companies returned undefined data');
    }
    return data.exploreCompanies;
  } catch (error) {
    console.error('Şirketler keşfedilirken hata:', error);
    throw error;
  }
}

// ==========================================
// API FUNCTIONS
// ==========================================

export async function fetchCompany(id: string): Promise<CompanyData | null> {
  try {
    console.log(`🏢 Fetching company with ID: ${id}`);

    const result = await apolloClient.query({
      query: GET_COMPANY,
      variables: { id },
    });

    const company = (result.data as any).company;
    if (!company) {
      console.log(`❌ Company not found: ${id}`);
      return null;
    }

    console.log(`✅ Company fetched successfully:`, company.name);
    return company;
  } catch (error) {
    console.error(`❌ Error fetching company: ${id}`, error);
    return null;
  }
}

export async function fetchCompanyContents(
  companyId: string,
  companyRoleId?: number | null,
  limit?: number
): Promise<CompanyContentData[]> {
  try {
    console.log(
      `🎮 Fetching contents for company: ${companyId}, roleId: ${companyRoleId || 'all'}`
    );

    const result = await apolloClient.query({
      query: GET_COMPANY_CONTENTS,
      variables: { companyId, companyRoleId, limit },
    });

    const contents = (result.data as any).companyContents;
    console.log(`✅ Company contents fetched:`, contents.length);
    return contents;
  } catch (error) {
    console.error(`❌ Error fetching company contents: ${companyId}`, error);
    return [];
  }
}

export async function searchCompanies(name: string, limit: number = 20): Promise<CompanyData[]> {
  try {
    console.log(`🔍 Searching companies by name: ${name}`);

    const result = await apolloClient.query({
      query: SEARCH_COMPANIES,
      variables: { name, limit },
    });

    const companies = (result.data as any).searchCompanies;
    console.log(`✅ Companies found:`, companies.length);
    return companies;
  } catch (error) {
    console.error(`❌ Error searching companies: ${name}`, error);
    return [];
  }
}
