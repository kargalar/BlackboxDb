/**
 * List GraphQL Fragments, Queries & Mutations
 * Separated from service logic for clean code organization
 */

import { gql } from '@apollo/client';

// ==========================================
// LIST FRAGMENTS
// ==========================================

export const LIST_BASIC_FIELDS = gql`
  fragment ListBasicFields on UserList {
    id
    name
    description
    contentTypeId
    ownerId
    isPublic
    isOrdered
    upvoteCount
    downvoteCount
    score
    userVote
    itemCount
    createdAt
    updatedAt
    owner {
      id
      username
      picturePath
    }
    contentType {
      id
      name
    }
  }
`;

export const LIST_ITEM_FIELDS = gql`
  fragment ListItemFields on UserListItem {
    id
    listId
    contentId
    addedById
    displayOrder
    addedAt
    addedBy {
      id
      username
      picturePath
    }
    content {
      id
      title
      posterUrl
      releaseDate
      consumeCount
      favoriteCount
      ratingDistribution
      tmdbRating
      contentType {
        id
        name
      }
    }
  }
`;

export const COLLABORATOR_FIELDS = gql`
  fragment CollaboratorFields on UserListCollaborator {
    id
    listId
    userId
    role
    addedAt
    user {
      id
      username
      picturePath
    }
  }
`;

// ==========================================
// LIST QUERIES
// ==========================================

export const GET_MY_LISTS = gql`
  query GetMyLists {
    myLists {
      ...ListBasicFields
      items {
        ...ListItemFields
      }
      collaborators {
        ...CollaboratorFields
      }
    }
  }
  ${LIST_BASIC_FIELDS}
  ${LIST_ITEM_FIELDS}
  ${COLLABORATOR_FIELDS}
`;

export const GET_USER_LISTS = gql`
  query GetUserLists($username: String!) {
    userLists(username: $username) {
      ...ListBasicFields
      items {
        ...ListItemFields
      }
      collaborators {
        ...CollaboratorFields
      }
    }
  }
  ${LIST_BASIC_FIELDS}
  ${LIST_ITEM_FIELDS}
  ${COLLABORATOR_FIELDS}
`;

export const GET_LIST = gql`
  query GetList($id: Int!) {
    list(id: $id) {
      ...ListBasicFields
      items {
        ...ListItemFields
      }
      collaborators {
        ...CollaboratorFields
      }
    }
  }
  ${LIST_BASIC_FIELDS}
  ${LIST_ITEM_FIELDS}
  ${COLLABORATOR_FIELDS}
`;

export const GET_SAVED_LISTS = gql`
  query GetSavedLists {
    savedLists {
      ...ListBasicFields
      items {
        ...ListItemFields
      }
      collaborators {
        ...CollaboratorFields
      }
    }
  }
  ${LIST_BASIC_FIELDS}
  ${LIST_ITEM_FIELDS}
  ${COLLABORATOR_FIELDS}
`;

export const IS_LIST_SAVED = gql`
  query IsListSaved($listId: Int!) {
    isListSaved(listId: $listId)
  }
`;

// ==========================================
// LIST MUTATIONS
// ==========================================

export const CREATE_LIST = gql`
  mutation CreateList(
    $name: String!
    $description: String
    $contentTypeId: Int!
    $isPublic: Boolean!
    $isOrdered: Boolean!
  ) {
    createList(
      name: $name
      description: $description
      contentTypeId: $contentTypeId
      isPublic: $isPublic
      isOrdered: $isOrdered
    ) {
      ...ListBasicFields
    }
  }
  ${LIST_BASIC_FIELDS}
`;

export const UPDATE_LIST = gql`
  mutation UpdateList(
    $id: Int!
    $name: String
    $description: String
    $isPublic: Boolean
    $isOrdered: Boolean
  ) {
    updateList(
      id: $id
      name: $name
      description: $description
      isPublic: $isPublic
      isOrdered: $isOrdered
    ) {
      ...ListBasicFields
    }
  }
  ${LIST_BASIC_FIELDS}
`;

export const DELETE_LIST = gql`
  mutation DeleteList($id: Int!) {
    deleteList(id: $id)
  }
`;

export const ADD_TO_LIST = gql`
  mutation AddToList($listId: Int!, $contentId: String!) {
    addToList(listId: $listId, contentId: $contentId) {
      ...ListItemFields
    }
  }
  ${LIST_ITEM_FIELDS}
`;

export const REMOVE_FROM_LIST = gql`
  mutation RemoveFromList($listId: Int!, $contentId: String!) {
    removeFromList(listId: $listId, contentId: $contentId)
  }
`;

export const REORDER_LIST_ITEMS = gql`
  mutation ReorderListItems($listId: Int!, $items: [ReorderItemInput!]!) {
    reorderListItems(listId: $listId, items: $items)
  }
`;

export const ADD_COLLABORATOR = gql`
  mutation AddCollaborator($listId: Int!, $username: String!, $role: String!) {
    addCollaborator(listId: $listId, username: $username, role: $role) {
      ...CollaboratorFields
    }
  }
  ${COLLABORATOR_FIELDS}
`;

export const REMOVE_COLLABORATOR = gql`
  mutation RemoveCollaborator($listId: Int!, $username: String!) {
    removeCollaborator(listId: $listId, username: $username)
  }
`;

export const LEAVE_LIST = gql`
  mutation LeaveList($listId: Int!) {
    leaveList(listId: $listId)
  }
`;

export const SAVE_LIST = gql`
  mutation SaveList($listId: Int!) {
    saveList(listId: $listId)
  }
`;

export const UNSAVE_LIST = gql`
  mutation UnsaveList($listId: Int!) {
    unsaveList(listId: $listId)
  }
`;

export const GET_PUBLIC_LISTS = gql`
  query GetPublicLists($sortBy: String, $contentTypeId: Int, $limit: Int, $offset: Int) {
    publicLists(sortBy: $sortBy, contentTypeId: $contentTypeId, limit: $limit, offset: $offset) {
      ...ListBasicFields
      items {
        ...ListItemFields
      }
      collaborators {
        ...CollaboratorFields
      }
    }
  }
  ${LIST_BASIC_FIELDS}
  ${LIST_ITEM_FIELDS}
  ${COLLABORATOR_FIELDS}
`;

export const GET_LISTS_CONTAINING_CONTENT = gql`
  query ListsContainingContent($contentId: String!, $limit: Int, $offset: Int) {
    listsContainingContent(contentId: $contentId, limit: $limit, offset: $offset) {
      ...ListBasicFields
      items {
        ...ListItemFields
      }
      collaborators {
        ...CollaboratorFields
      }
    }
  }
  ${LIST_BASIC_FIELDS}
  ${LIST_ITEM_FIELDS}
  ${COLLABORATOR_FIELDS}
`;

export const GET_LISTS_CONTAINING_CONTENT_COUNT = gql`
  query ListsContainingContentCount($contentId: String!) {
    listsContainingContentCount(contentId: $contentId)
  }
`;

export const VOTE_LIST = gql`
  mutation VoteList($id: Int!, $voteType: Int!) {
    voteList(id: $id, voteType: $voteType) {
      id
      upvoteCount
      downvoteCount
      score
      userVote
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      picturePath
    }
  }
`;
