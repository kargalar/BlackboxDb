import type { PersonRole } from '@/services/graphql/admin';

export interface Person {
  id?: string | number;
  name: string;
  role?: string;
  personRoleId?: number;
  personRoleLabel?: string;
  character?: string;
  profileUrl?: string;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
  placeOfBirth?: string;
  creditOrder?: number;
}

export interface PersonListInputProps {
  label: string;
  value: Array<Person>;
  onChange: (people: Array<Person>) => void;
  placeholder?: string;
  roleLabel?: string;
  contentTypeId?: number;
  showCharacterField?: boolean;
}

export interface PersonChipProps {
  person: Person;
  index: number;
  totalCount: number;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  allPersons: Person[];
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, toIndex: number) => void;
  onDragEnd: () => void;
  onEdit: (index: number, person: Person) => void;
  onRemove: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

export interface AddPersonDropdownProps {
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  tempName: string;
  setTempName: (name: string) => void;
  tempRole: PersonRole | null;
  setTempRole: (role: PersonRole | null) => void;
  tempCharacter: string;
  setTempCharacter: (char: string) => void;
  suggestions: Person[];
  isInitialLoading: boolean;
  isSearching: boolean;
  showCharacterField: boolean;
  placeholder: string;
  roles: PersonRole[];
  roleSearchTerm: string;
  setRoleSearchTerm: (term: string) => void;
  showRoleDropdown: boolean;
  setShowRoleDropdown: (show: boolean) => void;
  contentTypeId?: number;
  onSuggestionClick: (person: Person) => void;
  onShowDialog: () => void;
  onCreateRole: (label: string) => Promise<void>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  roleInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface NewPersonDialogProps {
  onClose: () => void;
  onSave: (person: Person) => void;
  initialName?: string;
  initialRole?: PersonRole | null;
  initialCharacter?: string;
  showCharacterField?: boolean;
  roles?: PersonRole[];
  onCreateRole?: (label: string) => Promise<void>;
  /** Edit mode: pass existing person data */
  person?: Person | null;
  /** 'create' (default) or 'edit' */
  mode?: 'create' | 'edit';
  /** 'local' = just call onSave, 'api' = call updatePerson then onSave */
  apiMode?: 'local' | 'api';
  /** Custom dialog title */
  title?: string;
}
