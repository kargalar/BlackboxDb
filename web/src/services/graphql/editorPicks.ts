import { gql } from '@apollo/client';
import type { UnifiedContent } from '@/types/unified-content';

export interface EditorPick {
  id: number;
  contentId: string;
  contentTypeId: number;
  label?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  content?: UnifiedContent | null;
}

export interface EditorPickItemInput {
  contentId: string;
  label?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
}

export const GET_EDITOR_PICKS = gql`
  query GetEditorPicks($contentTypeId: Int) {
    editorPicks(contentTypeId: $contentTypeId) {
      id
      contentId
      contentTypeId
      label
      imageUrl
      displayOrder
      createdAt
      updatedAt
      content {
        id
        title
        contentTypeId
        releaseDate
        firstAirDate
        publishedDate
        description
        posterUrl
        backdropUrl
        runtime
        status
      }
    }
  }
`;

export const SET_EDITOR_PICKS = gql`
  mutation SetEditorPicks($contentTypeId: Int!, $picks: [EditorPickItemInput!]!) {
    setEditorPicks(contentTypeId: $contentTypeId, picks: $picks) {
      id
      contentId
      contentTypeId
      label
      imageUrl
      displayOrder
      createdAt
      updatedAt
      content {
        id
        title
        contentTypeId
        releaseDate
        firstAirDate
        publishedDate
        description
        posterUrl
        backdropUrl
        runtime
        status
      }
    }
  }
`;

export const REMOVE_EDITOR_PICK = gql`
  mutation RemoveEditorPick($id: Int!) {
    removeEditorPick(id: $id)
  }
`;

