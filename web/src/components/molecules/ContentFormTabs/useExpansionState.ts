'use client';

/**
 * Custom hook for expansion state management (Expansion or Remake).
 * Single Responsibility: Expansion CRUD logic, drag & drop, and file handling.
 */

import { useState, useRef } from 'react';
import { ExpansionItem } from './GameFieldsTypes';

interface UseExpansionStateParams {
  type: 'expansion' | 'remake';
  formData: any;
  setFormData: (data: any) => void;
  onFileSelect: (file: File, target: 'expansion' | 'remake') => void;
}

export function useExpansionState({
  type,
  formData,
  setFormData,
  onFileSelect,
}: UseExpansionStateParams) {
  const [newItem, setNewItem] = useState<Omit<ExpansionItem, 'type'>>({
    name: '',
    description: '',
    posterUrl: '',
    releaseDate: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TAG = `🎮 [useExpansionState:${type.toUpperCase()}]`;

  // Filter expansions by type with backward compatibility
  // Expansion: items without a type default to 'expansion'
  // Remake: items without a type default to '' (not treated as remake)
  const filteredExpansions = (formData.expansions || []).filter((e: ExpansionItem) => {
    const defaultType = type === 'expansion' ? 'expansion' : '';
    const eType = String(e.type || defaultType)
      .toLowerCase()
      .trim();
    console.log(
      `🔍 ${TAG} filter - name:`,
      e.name,
      'type:',
      e.type,
      'normalized:',
      eType,
      `is${type}:`,
      eType === type
    );
    return eType === type;
  });

  // Find real index in the shared expansions array
  const getExpansionIndex = (expansion: ExpansionItem) => {
    return (formData.expansions || []).findIndex(
      (e: ExpansionItem) =>
        e.name === expansion.name && String(e.type || 'expansion').toLowerCase() === type
    );
  };

  const handleAdd = () => {
    if (!newItem.name.trim()) {
      console.warn(`⚠️ ${TAG} Add failed: empty name`);
      return;
    }
    const expansions = [...(formData.expansions || []), { ...newItem, type }];
    setFormData({ ...formData, expansions });
    setNewItem({ name: '', description: '', posterUrl: '', releaseDate: '' });
    setShowForm(false);
    console.log(`✅ ${TAG} Added:`, newItem.name);
  };

  const handleEdit = (expansion: ExpansionItem) => {
    const realIndex = getExpansionIndex(expansion);
    setNewItem({
      name: expansion.name,
      description: expansion.description || '',
      posterUrl: expansion.posterUrl || '',
      releaseDate: expansion.releaseDate || '',
    });
    setEditingIndex(realIndex);
    setShowForm(true);
    console.log(`📝 ${TAG} Editing:`, expansion.name, 'at index:', realIndex);
  };

  const handleSaveEdit = () => {
    if (!newItem.name.trim() || editingIndex === null) {
      console.warn(`⚠️ ${TAG} Save edit failed: empty name or no editingIndex`);
      return;
    }
    const expansions = [...(formData.expansions || [])];
    expansions[editingIndex] = { ...newItem, type };
    setFormData({ ...formData, expansions });
    setNewItem({ name: '', description: '', posterUrl: '', releaseDate: '' });
    setShowForm(false);
    setEditingIndex(null);
    console.log(`✅ ${TAG} Saved edit:`, newItem.name);
  };

  const handleCancelEdit = () => {
    setNewItem({ name: '', description: '', posterUrl: '', releaseDate: '' });
    setShowForm(false);
    setEditingIndex(null);
    console.log(`🚫 ${TAG} Cancelled edit`);
  };

  const handleRemove = (expansion: ExpansionItem) => {
    const realIndex = getExpansionIndex(expansion);
    if (realIndex === -1) {
      console.warn(`⚠️ ${TAG} Could not find item to remove:`, expansion.name);
      return;
    }
    const expansions = [...(formData.expansions || [])];
    expansions.splice(realIndex, 1);
    setFormData({ ...formData, expansions });
    console.log(`🗑️ ${TAG} Removed at index:`, realIndex, 'name:', expansion.name);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      console.log(`📁 ${TAG} File dropped:`, file.name);
      onFileSelect(file, type);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`📁 ${TAG} File selected:`, file.name);
      onFileSelect(file, type);
    }
  };

  const setPosterUrl = (url: string) => {
    setNewItem((prev) => ({ ...prev, posterUrl: url }));
    console.log(`🖼️ ${TAG} Poster URL updated`);
  };

  return {
    newItem,
    setNewItem,
    showForm,
    setShowForm,
    editingIndex,
    isDragging,
    fileInputRef,
    filteredExpansions,
    handleAdd,
    handleEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleRemove,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    setPosterUrl,
  };
}

export type ExpansionStateReturn = ReturnType<typeof useExpansionState>;
