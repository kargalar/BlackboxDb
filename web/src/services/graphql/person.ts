import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';

// ==========================================
// PERSON FRAGMENTS
// ==========================================

export const PERSON_OBJECT_BASIC_FIELDS = gql`
  fragment PersonObjectBasicFields on PersonObject {
    id
    name
    biography
    birthDate
    deathDate
    gender
    profileUrl
    placeOfBirth
  }
`;

export const PERSON_BASIC_FIELDS = gql`
  fragment PersonBasicFields on Person {
    id
    name
    biography
    birthDate
    deathDate
    gender
    profileUrl
    placeOfBirth
  }
`;

export const PERSON_WITH_CONTENT_ROLES = gql`
  fragment PersonWithContentRoles on Person {
    ...PersonBasicFields
    roles
    roleCount
  }
`;

// ==========================================
// QUERIES
// ==========================================

export const EXPLORE_PERSONS = gql`
  query ExplorePersons(
    $search: String
    $page: Int
    $limit: Int
    $sortBy: String
    $sortOrder: String
    $gender: String
    $status: String
    $minYear: Int
    $maxYear: Int
    $roles: [String!]
  ) {
    explorePersons(
      search: $search
      page: $page
      limit: $limit
      sortBy: $sortBy
      sortOrder: $sortOrder
      gender: $gender
      status: $status
      minYear: $minYear
      maxYear: $maxYear
      roles: $roles
    ) {
      totalCount
      items {
        ...PersonBasicFields
        roles
        roleCount
      }
    }
  }
  ${PERSON_BASIC_FIELDS}
`;

export const GET_PERSON = gql`
  query GetPerson($id: String!) {
    person(id: $id) {
      ...PersonBasicFields
      roles
      roleCount
      isFavorite
      contentRoles {
        id
        role
        character
        department
        job
        creditOrder
        person {
          ...PersonObjectBasicFields
        }
      }
    }
  }
  ${PERSON_BASIC_FIELDS}
  ${PERSON_OBJECT_BASIC_FIELDS}
`;

export const GET_PERSON_CONTENT = gql`
  query GetPersonContent($personId: String!, $role: String, $limit: Int) {
    personContents(personId: $personId, role: $role, limit: $limit) {
      contentId
      contentTitle
      contentType
      role
      character
      releaseDate
      popularity
      posterUrl
      ratingDistribution
      tmdbRating
      userStatus {
        isConsumed
        isFavorite
        isConsumeLater
        isContinuing
        rating
        consumedDate
        consumeLaterDate
      }
    }
  }
`;

export const GET_PERSON_CAST_CONTENT = gql`
  query GetPersonCastContent($personId: String!, $limit: Int) {
    personCastContent(personId: $personId, limit: $limit) {
      contentId
      contentTitle
      contentType
      role
      character
      releaseDate
      popularity
      posterUrl
      ratingDistribution
      tmdbRating
      userStatus {
        isConsumed
        isFavorite
        isConsumeLater
        isContinuing
        rating
        consumedDate
        consumeLaterDate
      }
    }
  }
`;

export const GET_PERSON_CREW_CONTENT = gql`
  query GetPersonCrewContent($personId: String!, $department: String, $limit: Int) {
    personCrewContent(personId: $personId, department: $department, limit: $limit) {
      contentId
      contentTitle
      contentType
      role
      character
      releaseDate
      popularity
      posterUrl
      ratingDistribution
      tmdbRating
      userStatus {
        isConsumed
        isFavorite
        isConsumeLater
        isContinuing
        rating
        consumedDate
        consumeLaterDate
      }
    }
  }
`;

export const SEARCH_PERSONS_BY_NAME = gql`
  query SearchPersonsByName($name: String!, $limit: Int) {
    personsByName(name: $name, limit: $limit) {
      ...PersonWithContentRoles
    }
  }
  ${PERSON_WITH_CONTENT_ROLES}
  ${PERSON_BASIC_FIELDS}
`;

export const GET_PERSONS_BY_ROLE = gql`
  query GetPersonsByRole($role: String!, $limit: Int) {
    personsByRole(role: $role, limit: $limit) {
      ...PersonWithContentRoles
    }
  }
  ${PERSON_WITH_CONTENT_ROLES}
  ${PERSON_BASIC_FIELDS}
`;

export const GET_USER_FAVORITE_PEOPLE = gql`
  query GetUserFavoritePeople($userId: String!, $limit: Int) {
    userFavoritePeople(userId: $userId, limit: $limit) {
      ...PersonWithContentRoles
      isFavorite
    }
  }
  ${PERSON_WITH_CONTENT_ROLES}
  ${PERSON_BASIC_FIELDS}
`;

export const TOGGLE_FAVORITE_PERSON = gql`
  mutation ToggleFavoritePerson($personId: String!) {
    toggleFavoritePerson(personId: $personId)
  }
`;

// ==========================================
// API Functions
// ==========================================

export interface PersonData {
  id: string;
  name: string;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
  gender?: string;
  profileUrl?: string;
  placeOfBirth?: string;
  roles?: string[];
  roleCount?: number;
  isFavorite?: boolean;
  contentRoles?: Array<{
    id: number;
    role: string;
    character?: string;
    department?: string;
    job?: string;
    creditOrder?: number;
    person: PersonData;
  }>;
}

export interface PersonContentData {
  contentId: string;
  contentTitle: string;
  contentType: string;
  role: string;
  character?: string;
  releaseDate?: string;
  popularity?: number;
  posterUrl?: string;
  ratingDistribution?: number[];
  tmdbRating?: number | null;
  userStatus?: {
    isConsumed: boolean;
    isFavorite: boolean;
    isConsumeLater: boolean;
    isContinuing: boolean;
    rating: number | null;
    consumedDate?: string | null;
    consumeLaterDate?: string | null;
  } | null;
}

export async function fetchPerson(id: string): Promise<PersonData | null> {
  try {
    console.log(`🎭 Fetching person with ID: ${id}`);

    const result = await apolloClient.query({
      query: GET_PERSON,
      variables: { id },
    });

    const person = (result.data as any).person;
    console.log(`✅ Person fetched successfully:`, person.name);
    return person;
  } catch (error) {
    console.error(`❌ Error fetching person: ${id}`, error);
    return null;
  }
}

export async function explorePersons(params: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  gender?: string;
  status?: string;
  minYear?: number;
  maxYear?: number;
  roles?: string[];
}) {
  try {
    const { data, error } = await apolloClient.query<{
      explorePersons: { items: PersonData[]; totalCount: number };
    }>({
      query: EXPLORE_PERSONS,
      variables: params,
      fetchPolicy: 'network-only',
    });
    if (error || !data) {
      throw new Error(error?.message || 'Explore persons returned undefined data');
    }
    return data.explorePersons;
  } catch (error) {
    console.error('Kişiler keşfedilirken hata:', error);
    throw error;
  }
}

export async function fetchPersonCastContent(
  personId: string,
  limit: number = 100
): Promise<PersonContentData[]> {
  try {
    console.log(`🎬 Fetching cast content for person: ${personId}`);

    const result = await apolloClient.query({
      query: GET_PERSON_CAST_CONTENT,
      variables: { personId, limit },
    });

    const content = (result.data as any).personCastContent;
    console.log(`✅ Cast content fetched:`, content.length);
    return content;
  } catch (error) {
    console.error(`❌ Error fetching cast content for person: ${personId}`, error);
    return [];
  }
}

export async function fetchPersonCrewContent(
  personId: string,
  department?: string,
  limit: number = 100
): Promise<PersonContentData[]> {
  try {
    console.log(
      `👨‍💼 Fetching crew content for person: ${personId}, department: ${department || 'all'}`
    );

    const result = await apolloClient.query({
      query: GET_PERSON_CREW_CONTENT,
      variables: { personId, department, limit },
    });

    const content = (result.data as any).personCrewContent;
    console.log(`✅ Crew content fetched:`, content.length);
    return content;
  } catch (error) {
    console.error(`❌ Error fetching crew content for person: ${personId}`, error);
    return [];
  }
}

export async function searchPersons(name: string, limit: number = 20): Promise<PersonData[]> {
  try {
    console.log(`🔍 Searching persons by name: ${name}`);

    const result = await apolloClient.query({
      query: SEARCH_PERSONS_BY_NAME,
      variables: { name, limit },
    });

    const persons = (result.data as any).personsByName;
    console.log(`✅ Persons found:`, persons.length);
    return persons;
  } catch (error) {
    console.error(`❌ Error searching persons: ${name}`, error);
    return [];
  }
}

export async function fetchPersonsByRole(role: string, limit: number = 50): Promise<PersonData[]> {
  try {
    console.log(`👥 Fetching persons by role: ${role}`);

    const result = await apolloClient.query({
      query: GET_PERSONS_BY_ROLE,
      variables: { role, limit },
    });

    const persons = (result.data as any).personsByRole;
    console.log(`✅ Persons fetched:`, persons.length);
    return persons;
  } catch (error) {
    console.error(`❌ Error fetching persons by role: ${role}`, error);
    return [];
  }
}

export async function fetchUserFavoritePeople(
  userId: string,
  limit: number = 12
): Promise<PersonData[]> {
  try {
    const result = await apolloClient.query({
      query: GET_USER_FAVORITE_PEOPLE,
      variables: { userId, limit },
      fetchPolicy: 'network-only',
    });

    return (result.data as any).userFavoritePeople || [];
  } catch (error) {
    console.error(`❌ Error fetching favorite people for user: ${userId}`, error);
    return [];
  }
}

export async function toggleFavoritePerson(personId: string): Promise<boolean> {
  try {
    const result = await apolloClient.mutate({
      mutation: TOGGLE_FAVORITE_PERSON,
      variables: { personId },
    });

    return Boolean((result.data as any)?.toggleFavoritePerson);
  } catch (error) {
    console.error(`❌ Error toggling favorite person: ${personId}`, error);
    throw error;
  }
}
