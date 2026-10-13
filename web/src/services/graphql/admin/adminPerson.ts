import { gql } from '@apollo/client';

// ==========================================
// PERSON MANAGEMENT
// ==========================================

export const SEARCH_PERSONS = gql`
  query SearchPersons($search: String!, $limit: Int) {
    searchPersons(search: $search, limit: $limit) {
      id
      name
      biography
      profileUrl
      birthDate
      deathDate
      gender
      placeOfBirth
      createdAt
    }
  }
`;

export const LIST_PERSONS = gql`
  query ListPersons(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listPersons(
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      biography
      profileUrl
      birthDate
      deathDate
      gender
      placeOfBirth
      createdAt
      contentCount
    }
  }
`;

export const CREATE_PERSON = gql`
  mutation CreatePerson($input: PersonInput!) {
    createPerson(input: $input) {
      id
      name
      biography
      profileUrl
      birthDate
      deathDate
      gender
      placeOfBirth
      createdAt
    }
  }
`;

export const UPDATE_PERSON = gql`
  mutation UpdatePerson($id: String!, $input: PersonInput!) {
    updatePerson(id: $id, input: $input) {
      id
      name
      biography
      profileUrl
      birthDate
      deathDate
      gender
      placeOfBirth
      createdAt
    }
  }
`;

export const DELETE_PERSON = gql`
  mutation DeletePerson($id: String!) {
    deletePerson(id: $id)
  }
`;

// ==========================================
// PERSON ROLES
// ==========================================

export const LIST_PERSON_ROLES = gql`
  query ListPersonRoles(
    $contentTypeId: Int
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listPersonRoles(
      contentTypeId: $contentTypeId
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      label
      contentTypeId
      contentCount
    }
  }
`;

export const CREATE_PERSON_ROLE = gql`
  mutation CreatePersonRole($input: PersonRoleInput!) {
    createPersonRole(input: $input) {
      id
      label
      contentTypeId
    }
  }
`;

export const UPDATE_PERSON_ROLE = gql`
  mutation UpdatePersonRole($id: Int!, $input: PersonRoleInput!) {
    updatePersonRole(id: $id, input: $input) {
      id
      label
      contentTypeId
    }
  }
`;

export const DELETE_PERSON_ROLE = gql`
  mutation DeletePersonRole($id: Int!) {
    deletePersonRole(id: $id)
  }
`;

// ==========================================
// ACTORS / DIRECTORS LISTS
// ==========================================

export const LIST_ACTORS = gql`
  query ListActors($limit: Int, $offset: Int, $search: String) {
    listActors(limit: $limit, offset: $offset, search: $search) {
      id
      name
      biography
      profileUrl
      birthDate
      deathDate
      gender
      placeOfBirth
      createdAt
      contentCount
    }
  }
`;

export const LIST_DIRECTORS = gql`
  query ListDirectors($limit: Int, $offset: Int, $search: String) {
    listDirectors(limit: $limit, offset: $offset, search: $search) {
      id
      name
      biography
      profileUrl
      birthDate
      deathDate
      gender
      placeOfBirth
      createdAt
      contentCount
    }
  }
`;

// ==========================================
// PERSON TYPESCRIPT TYPES
// ==========================================

export interface Person {
  id: number;
  name: string;
  biography?: string;
  profileUrl?: string;
  birthDate?: string;
  deathDate?: string;
  gender?: string;
  placeOfBirth?: string;
  createdAt: string;
  contentCount?: number;
}

export interface PersonInput {
  id?: number;
  name: string;
  biography?: string | null;
  birthDate?: string;
  deathDate?: string;
  gender?: string;
  profileUrl?: string | null;
  placeOfBirth?: string;
}

export interface PersonRole {
  id: number;
  label: string;
  contentTypeId?: number;
  contentCount?: number;
}

export interface PersonRoleInput {
  id?: number;
  label: string;
  contentTypeId?: number;
}
