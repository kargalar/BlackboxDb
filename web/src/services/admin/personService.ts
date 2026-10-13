/**
 * Person Service
 * Handles person-related operations
 */

import { createCrudOperations, graphqlQuery } from '@/lib/graphqlHelpers';
import {
  SEARCH_PERSONS,
  LIST_PERSONS,
  CREATE_PERSON,
  UPDATE_PERSON,
  DELETE_PERSON,
  type Person,
  type PersonInput,
} from '../graphql/admin';

export async function searchPersons(
  search: string,
  limit: number = 10
): Promise<{
  data: Array<{
    id: number;
    name: string;
    biography?: string;
    profileUrl?: string;
    birthDate?: string;
    deathDate?: string;
    placeOfBirth?: string;
  }>;
  error?: any;
}> {
  console.log('🔍 [GraphQL] Searching persons:', search);

  return graphqlQuery<
    Array<{
      id: number;
      name: string;
      biography?: string;
      profileUrl?: string;
      birthDate?: string;
      deathDate?: string;
      placeOfBirth?: string;
    }>
  >(SEARCH_PERSONS, { search, limit }, 'searchPersons');
}

// --- PERSON CRUD ---
const personOps = createCrudOperations<Person, PersonInput>({
  entityName: 'person',
  emoji: '👤',
  queries: {
    list: LIST_PERSONS,
    create: CREATE_PERSON,
    update: UPDATE_PERSON,
    delete: DELETE_PERSON,
  },
  dataKeys: {
    list: 'listPersons',
    create: 'createPerson',
    update: 'updatePerson',
    delete: 'deletePerson',
  },
});
export const listPersons = personOps.list;
export const createPerson = personOps.create;
export const updatePerson = personOps.update;
export const deletePerson = personOps.delete;
