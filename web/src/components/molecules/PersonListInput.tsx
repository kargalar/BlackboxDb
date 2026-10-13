'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { searchPersons } from '@/services/adminService';
import { apolloClient } from '@/lib/apollo-client';
import { LIST_PERSON_ROLES, CREATE_PERSON_ROLE, PersonRole } from '@/services/graphql/admin';
import { reorderArray } from '@/lib/array-utils';
import type { Person } from './personListTypes';
import { PersonChip } from './PersonChip';
import { AddPersonDropdown } from './AddPersonDropdown';
import { NewPersonDialog } from './NewPersonDialog';

interface PersonListInputProps {
  label: string;
  value: Array<Person>;
  onChange: (people: Array<Person>) => void;
  placeholder?: string;
  roleLabel?: string;
  contentTypeId?: number;
  showCharacterField?: boolean;
}

export { type Person } from './personListTypes';

export function PersonListInput({
  label,
  value,
  onChange,
  placeholder = 'İsim girin',
  roleLabel = 'Rol',
  contentTypeId,
  showCharacterField = false,
}: PersonListInputProps) {
  const [tempName, setTempName] = useState('');
  const [tempRole, setTempRole] = useState<PersonRole | null>(null);
  const [tempCharacter, setTempCharacter] = useState('');
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<Person | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [roles, setRoles] = useState<PersonRole[]>([]);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const roleInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [chipFilter, setChipFilter] = useState('');

  console.log('👥 [PersonListInput] Rendering, value count:', value.length, 'label:', label);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      const reordered = reorderArray(value, draggedIndex, toIndex);
      onChange(reordered);
      console.log('🔄 [PersonListInput] Reordered from', draggedIndex, 'to', toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMovePerson = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= value.length || fromIndex === toIndex) return;
    onChange(reorderArray(value, fromIndex, toIndex));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Rolleri API'den yükle
  useEffect(() => {
    let cancelled = false;

    const loadRoles = async () => {
      try {
        const { data } = await apolloClient.query<{ listPersonRoles: PersonRole[] }>({
          query: LIST_PERSON_ROLES,
          variables: { contentTypeId },
          fetchPolicy: 'cache-first',
        });
        if (!cancelled && data?.listPersonRoles) {
          setRoles(data.listPersonRoles);
          setTempRole(data.listPersonRoles[0] ?? null);
          console.log('✅ [PersonListInput] Roles loaded:', data.listPersonRoles.length);
        }
      } catch (error) {
        console.error('❌ [PersonListInput] Error loading roles:', error);
      }
    };
    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [contentTypeId]);

  // İlk yüklemede popüler kişileri getir (sadece öneri için)
  useEffect(() => {
    let cancelled = false;
    const loadInitialPersons = async () => {
      try {
        const result = await searchPersons('', 50);
        if (!cancelled && result.data) {
          setAllPersons(result.data);
          console.log('✅ [PersonListInput] Initial persons loaded:', result.data.length);
        }
      } catch (error) {
        console.error('❌ [PersonListInput] Error loading initial persons:', error);
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    };
    loadInitialPersons();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleTempNameChange = (name: string) => {
    setTempName(name);
    setSuggestions([]);
    setIsSearching(false);
  };

  // API'den arama yap (debounce ile)
  useEffect(() => {
    let cancelled = false;

    if (tempName.trim().length < 2) {
      // Kısa sorgu için yerel filtrele
      const availablePersons = allPersons.filter(
        (p) => p.name && !value.some((v) => v.name && v.name.toLowerCase() === p.name.toLowerCase())
      );
      if (tempName.trim().length < 1) {
        setSuggestions(availablePersons.slice(0, 50));
      } else {
        const filtered = availablePersons.filter((p) =>
          p.name.toLowerCase().includes(tempName.toLowerCase())
        );
        setSuggestions(filtered.slice(0, 50));
      }
      return () => {
        cancelled = true;
      };
    }

    // Debounce API search for 2+ chars
    const timer = setTimeout(async () => {
      try {
        if (cancelled) return;
        setIsSearching(true);
        console.log('🔍 [PersonListInput] API search:', tempName);
        const result = await searchPersons(tempName, 50);
        if (cancelled) return;

        if (result.data) {
          const available = result.data.filter(
            (p: Person) =>
              !value.some((v) => v.name && v.name.toLowerCase() === p.name.toLowerCase())
          );
          setSuggestions(available.slice(0, 50));
          console.log(
            `✅ [PersonListInput] API search found ${result.data.length} results, ${available.length} available`
          );
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('❌ [PersonListInput] Search error:', error);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tempName, value, allPersons]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addPerson = (person?: Person) => {
    if (!tempName.trim()) return;

    if (person) {
      const newPerson: Person = {
        id: person.id,
        name: person.name,
        personRoleId: tempRole?.id,
        personRoleLabel: tempRole?.label,
        role: tempRole?.label,
        character: tempCharacter || undefined,
        profileUrl: person.profileUrl,
        biography: person.biography,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        placeOfBirth: person.placeOfBirth,
      };

      if (!value.some((p) => p.name.toLowerCase() === newPerson.name.toLowerCase())) {
        onChange([...value, newPerson]);
        console.log('➕ [PersonListInput] Added person:', newPerson.name);
        setTempName('');
        setIsSearching(false);
        setTempRole(roles.length > 0 ? roles[0] : null);
        setTempCharacter('');
        setSuggestions([]);
        setShowDropdown(false);
      }
    } else {
      setShowDialog(true);
    }
  };

  const removePerson = (index: number) => {
    console.log('🗑️ [PersonListInput] Removing person at index:', index);
    onChange(value.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = (person: Person) => {
    handleTempNameChange(person.name);
    setTimeout(() => addPerson(person), 100);
  };

  const handleEditPerson = (index: number, person: Person) => {
    setEditingIndex(index);
    setEditData(person);
  };

  const handleCreateRole = async (label: string) => {
    try {
      const { data } = await apolloClient.mutate<{ createPersonRole: PersonRole }>({
        mutation: CREATE_PERSON_ROLE,
        variables: { input: { label, contentTypeId } },
      });
      if (data?.createPersonRole) {
        setRoles((prev) => [...prev, data.createPersonRole]);
        setTempRole(data.createPersonRole);
        setRoleSearchTerm('');
        setShowRoleDropdown(false);
        console.log('✅ [PersonListInput] Role created:', data.createPersonRole.label);
      }
    } catch (error) {
      console.error('❌ [PersonListInput] Error creating role:', error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3"
    >
      {/* Label Header with count */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
          {value.length > 0 && <span className="ml-1 text-blue-400">({value.length})</span>}
        </span>
      </div>

      {/* Chips filter — shown when 5+ people added */}
      {value.length >= 5 && (
        <div className="relative">
          <input
            type="text"
            value={chipFilter}
            onChange={(e) => setChipFilter(e.target.value)}
            placeholder={`${value.length} kişi arasında ara...`}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {chipFilter && (
            <button
              type="button"
              onClick={() => setChipFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Chips + Add Button Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Selected Persons as Chips */}
        {value
          .map((person, index) => ({ person, index }))
          .filter(({ person }) =>
            chipFilter
              ? person.name.toLowerCase().includes(chipFilter.toLowerCase()) ||
                (person.role || '').toLowerCase().includes(chipFilter.toLowerCase()) ||
                (person.character || '').toLowerCase().includes(chipFilter.toLowerCase())
              : true
          )
          .map(({ person, index }) => (
            <PersonChip
              key={index}
              person={person}
              index={index}
              totalCount={value.length}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              allPersons={allPersons}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onEdit={handleEditPerson}
              onRemove={removePerson}
              onMove={handleMovePerson}
            />
          ))}

        {/* Empty state */}
        {value.length === 0 && (
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">
            Henüz kimse eklenmedi
          </span>
        )}

        {/* Add Button + Dropdown */}
        <AddPersonDropdown
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          tempName={tempName}
          setTempName={handleTempNameChange}
          tempRole={tempRole}
          setTempRole={setTempRole}
          tempCharacter={tempCharacter}
          setTempCharacter={setTempCharacter}
          suggestions={suggestions}
          isSearching={isSearching}
          isInitialLoading={isInitialLoading}
          showCharacterField={showCharacterField}
          placeholder={placeholder}
          roles={roles}
          roleSearchTerm={roleSearchTerm}
          setRoleSearchTerm={setRoleSearchTerm}
          showRoleDropdown={showRoleDropdown}
          setShowRoleDropdown={setShowRoleDropdown}
          contentTypeId={contentTypeId}
          onSuggestionClick={handleSuggestionClick}
          onShowDialog={() => setShowDialog(true)}
          onCreateRole={handleCreateRole}
          inputRef={inputRef}
          roleInputRef={roleInputRef}
        />
      </div>

      {/* New Person Dialog - Full Form */}
      {showDialog && editingIndex === null && (
        <NewPersonDialog
          initialName={tempName}
          initialRole={tempRole}
          initialCharacter={tempCharacter}
          showCharacterField={showCharacterField}
          roles={roles}
          onCreateRole={handleCreateRole}
          onClose={() => setShowDialog(false)}
          onSave={(person) => {
            const newPerson: Person = {
              ...person,
            };
            onChange([...value, newPerson]);
            console.log(
              '✅ [PersonListInput] New person added via dialog:',
              newPerson.name,
              'role:',
              newPerson.role
            );
            setTempName('');
            setIsSearching(false);
            setTempRole(roles.length > 0 ? roles[0] : null);
            setTempCharacter('');
            setShowDialog(false);
            setShowDropdown(false);
          }}
        />
      )}

      {/* Edit Person Dialog */}
      {editingIndex !== null && editData && (
        <NewPersonDialog
          person={editData}
          mode="edit"
          showCharacterField={showCharacterField}
          apiMode="api"
          roles={roles}
          onCreateRole={handleCreateRole}
          onClose={() => {
            setEditingIndex(null);
            setEditData(null);
          }}
          onSave={(updatedPerson) => {
            const newValue = [...value];
            newValue[editingIndex] = updatedPerson as Person;
            onChange(newValue);
            console.log('✅ [PersonListInput] Person edited:', updatedPerson.name);
            setEditingIndex(null);
            setEditData(null);
          }}
        />
      )}
    </div>
  );
}
