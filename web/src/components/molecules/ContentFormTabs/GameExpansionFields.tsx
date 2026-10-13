'use client';

/**
 * GameExpansionFields - Expansion and Remake sections for games.
 * Displayed in the "Eklentiler & Remake'ler" tab.
 */

import { useState } from 'react';
import ImageCropModal from '@/components/molecules/ImageCropModal';
import { validateImageFile } from '@/lib/image-validation';
import { EXPANSION_CONFIG, REMAKE_CONFIG } from './GameFieldsTypes';
import { useExpansionState } from './useExpansionState';
import { ExpansionSection } from './ExpansionSection';

interface GameExpansionFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function GameExpansionFields({ formData, setFormData }: GameExpansionFieldsProps) {
  // Crop modal state (shared between Expansion and Remake)
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<'expansion' | 'remake'>('expansion');

  // File selection handler - opens crop modal
  const handleFileSelect = (file: File, target: 'expansion' | 'remake') => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      console.error('❌ [GameExpansionFields] Invalid file:', validation.error);
      return;
    }
    setSelectedFile(file);
    setCropTarget(target);
    setShowCropModal(true);
    console.log(`📁 [GameExpansionFields] File selected for ${target.toUpperCase()}:`, file.name);
  };

  // Expansion hooks for Expansion and Remake
  const expansionState = useExpansionState({
    type: 'expansion',
    formData,
    setFormData,
    onFileSelect: handleFileSelect,
  });

  const remakeState = useExpansionState({
    type: 'remake',
    formData,
    setFormData,
    onFileSelect: handleFileSelect,
  });

  // Crop complete handler
  const handleCropComplete = (croppedBase64: string) => {
    if (cropTarget === 'expansion') {
      expansionState.setPosterUrl(croppedBase64);
    } else {
      remakeState.setPosterUrl(croppedBase64);
    }
    setShowCropModal(false);
    setSelectedFile(null);
    console.log(`✅ [GameExpansionFields] Crop complete for ${cropTarget.toUpperCase()}`);
  };

  console.log('🧩 [GameExpansionFields] Render - expansions:', {
    total: (formData.expansions || []).length,
    expansionCount: expansionState.filteredExpansions.length,
    remakeCount: remakeState.filteredExpansions.length,
  });

  return (
    <div className="space-y-6">
      {/* Expansions */}
      <ExpansionSection config={EXPANSION_CONFIG} state={expansionState} />

      {/* Remakes */}
      <ExpansionSection config={REMAKE_CONFIG} state={remakeState} />

      {/* Crop Modal */}
      {selectedFile && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setSelectedFile(null);
          }}
          imageFile={selectedFile}
          imageType="expansion"
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
