import { gql } from '@apollo/client';

// ==========================================
// COMPANY TYPES & QUERIES
// ==========================================

export interface CompanyType {
  id: string;
  name: string;
  description?: string;
  headquarters?: string;
  logoUrl?: string;
  website?: string;
  foundingYear?: number;
  defaultRoleIds: number[];
  createdAt: string;
}

export interface CompanyInput {
  name: string;
  description?: string;
  headquarters?: string;
  logoUrl?: string;
  website?: string;
  foundingYear?: number;
  defaultRoleIds?: number[];
}

export const LIST_COMPANIES = gql`
  query ListCompanies(
    $limit: Int
    $offset: Int
    $search: String
    $roleIds: [Int!]
    $contentTypeId: Int
    $sortBy: String
    $sortOrder: String
  ) {
    listCompanies(
      limit: $limit
      offset: $offset
      search: $search
      roleIds: $roleIds
      contentTypeId: $contentTypeId
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
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
`;

export const CREATE_COMPANY = gql`
  mutation CreateCompany($input: CompanyInput!) {
    createCompany(input: $input) {
      id
      name
      description
      headquarters
      logoUrl
      website
      foundingYear
      defaultRoleIds
      createdAt
    }
  }
`;

export const UPDATE_COMPANY = gql`
  mutation UpdateCompany($id: String!, $input: CompanyInput!) {
    updateCompany(id: $id, input: $input) {
      id
      name
      description
      headquarters
      logoUrl
      website
      foundingYear
      defaultRoleIds
      createdAt
    }
  }
`;

export const DELETE_COMPANY = gql`
  mutation DeleteCompany($id: String!) {
    deleteCompany(id: $id)
  }
`;

// ==========================================
// COMPANY ROLE TYPES & QUERIES
// ==========================================

export interface CompanyRoleType {
  id: number;
  name: string;
  contentTypeId?: number | null;
}

export interface CompanyRoleInput {
  id?: number;
  name: string;
  contentTypeId?: number | null;
}

export const LIST_COMPANY_ROLES = gql`
  query ListCompanyRoles(
    $contentTypeId: Int
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listCompanyRoles(
      contentTypeId: $contentTypeId
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      contentTypeId
      contentCount
    }
  }
`;

export const CREATE_COMPANY_ROLE = gql`
  mutation CreateCompanyRole($input: CompanyRoleInput!) {
    createCompanyRole(input: $input) {
      id
      name
      contentTypeId
    }
  }
`;

export const UPDATE_COMPANY_ROLE = gql`
  mutation UpdateCompanyRole($id: Int!, $input: CompanyRoleInput!) {
    updateCompanyRole(id: $id, input: $input) {
      id
      name
      contentTypeId
    }
  }
`;

export const DELETE_COMPANY_ROLE = gql`
  mutation DeleteCompanyRole($id: Int!) {
    deleteCompanyRole(id: $id)
  }
`;
