'use client';

/**
 * GameInfoFields - Game-specific tag selectors (modes, perspectives, platforms, developers, publishers).
 * Expansion/DLC/Remake sections are in a separate tab via GameExpansionFields.
 */

import { FormInput } from '@/components/atoms/FormInput';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import {
  LIST_GAME_MODES,
  CREATE_GAME_MODE,
  LIST_GAME_ENGINES,
  CREATE_GAME_ENGINE,
  LIST_PERSPECTIVES,
  CREATE_PERSPECTIVE,
  LIST_PLATFORMS,
  CREATE_PLATFORM,
  LIST_COMPANIES,
  CREATE_COMPANY,
} from '@/services/graphql/admin';

interface SimpleItem {
  id?: number;
  name: string;
}

interface GameInfoFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function GameInfoFields({ formData, setFormData }: GameInfoFieldsProps) {
  const normalizeToItems = (value: any[]): SimpleItem[] => {
    if (!Array.isArray(value)) return [];
    return value.map((v) => (typeof v === 'string' ? { name: v } : v));
  };

  console.log('🎮 [GameInfoFields] Render');

  return (
    <div className="space-y-3">
      <FormInput
        label="IGDB ID"
        name="igdbId"
        type="number"
        value={formData.igdbId || ''}
        onChange={(value) =>
          setFormData({
            ...formData,
            igdbId: value ? Number(value) : undefined,
          })
        }
        placeholder="Örn: 1942"
      />

      <FormInput
        label="Dosya Boyutu"
        name="fileSize"
        type="text"
        value={formData.fileSize || ''}
        onChange={(value) =>
          setFormData({
            ...formData,
            fileSize: value,
          })
        }
        placeholder="Örn: 70 GB, 500 MB"
      />

      {/* Game Modes */}
      <CompactTagSelector
        label="Oyun Modları"
        icon="🎮"
        value={normalizeToItems(formData.gameModes || [])}
        onChange={(items) => setFormData({ ...formData, gameModes: items })}
        placeholder="Tek oyunculu, çoklu oyuncu..."
        emptyMessage="Mod eklenmedi"
        listQuery={LIST_GAME_MODES}
        createMutation={CREATE_GAME_MODE}
        queryKey="listGameModes"
        mutationKey="createGameMode"
        badgeColor="green"
        allowCreate={true}
      />

      {/* Perspectives */}
      <CompactTagSelector
        label="Oyun Motorları"
        icon="GE"
        value={normalizeToItems(formData.gameEngines || [])}
        onChange={(items) => setFormData({ ...formData, gameEngines: items })}
        placeholder="Unreal Engine, Unity, Source..."
        emptyMessage="Oyun motoru eklenmedi"
        listQuery={LIST_GAME_ENGINES}
        createMutation={CREATE_GAME_ENGINE}
        queryKey="listGameEngines"
        mutationKey="createGameEngine"
        badgeColor="blue"
        allowCreate={true}
      />

      {/* Perspectives */}
      <CompactTagSelector
        label="Perspektifler"
        icon="👁️"
        value={normalizeToItems(formData.perspectives || [])}
        onChange={(items) => setFormData({ ...formData, perspectives: items })}
        placeholder="Birinci şahıs, üçüncü şahıs..."
        emptyMessage="Perspektif eklenmedi"
        listQuery={LIST_PERSPECTIVES}
        createMutation={CREATE_PERSPECTIVE}
        queryKey="listPerspectives"
        mutationKey="createPerspective"
        badgeColor="purple"
        allowCreate={true}
      />

      {/* Platforms */}
      <CompactTagSelector
        label="Platformlar"
        icon="🖥️"
        value={normalizeToItems(formData.platforms || [])}
        onChange={(items) => setFormData({ ...formData, platforms: items })}
        placeholder="Windows, PlayStation, Xbox..."
        emptyMessage="Platform eklenmedi"
        listQuery={LIST_PLATFORMS}
        createMutation={CREATE_PLATFORM}
        queryKey="listPlatforms"
        mutationKey="createPlatform"
        badgeColor="blue"
        allowCreate={true}
      />

      {/* Developers */}
      <CompactTagSelector
        label="Geliştiriciler"
        icon="🏗️"
        value={formData.developerCompanies || []}
        onChange={(companies) => setFormData({ ...formData, developerCompanies: companies })}
        placeholder="CD Projekt Red, Rockstar Games..."
        listQuery={LIST_COMPANIES}
        queryKey="listCompanies"
        queryVariables={{ roleIds: [5] }}
        createMutation={CREATE_COMPANY}
        mutationKey="createCompany"
        createInputExtra={{ defaultRoleIds: [5] }}
        badgeColor="green"
        allowCreate={true}
      />

      {/* Publishers */}
      <CompactTagSelector
        label="Yayıncılar"
        icon="🏢"
        value={formData.publisherCompanies || []}
        onChange={(companies) => setFormData({ ...formData, publisherCompanies: companies })}
        placeholder="Electronic Arts, Ubisoft..."
        listQuery={LIST_COMPANIES}
        queryKey="listCompanies"
        queryVariables={{ roleIds: [4] }}
        createMutation={CREATE_COMPANY}
        mutationKey="createCompany"
        createInputExtra={{ defaultRoleIds: [4] }}
        badgeColor="purple"
        allowCreate={true}
      />
    </div>
  );
}
