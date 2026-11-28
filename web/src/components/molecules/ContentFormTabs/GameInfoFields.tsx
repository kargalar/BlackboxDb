'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

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
  const translateUi = useUiTranslations('Ui');
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
        placeholder={translateUi("orn_1942_3b570ea")}
      />

      <FormInput
        label={translateUi("dosya_boyutu_61f61b6")}
        name="fileSize"
        type="text"
        value={formData.fileSize || ''}
        onChange={(value) =>
          setFormData({
            ...formData,
            fileSize: value,
          })
        }
        placeholder={translateUi("orn_70_gb_500_mb_21d00e3")}
      />

      {/* Game Modes */}
      <CompactTagSelector
        label={translateUi("oyun_modlari_ad035f3")}
        icon="🎮"
        value={normalizeToItems(formData.gameModes || [])}
        onChange={(items) => setFormData({ ...formData, gameModes: items })}
        placeholder={translateUi("tek_oyunculu_coklu_oyuncu_449287b")}
        emptyMessage={translateUi("mod_eklenmedi_d4525b6")}
        listQuery={LIST_GAME_MODES}
        createMutation={CREATE_GAME_MODE}
        queryKey="listGameModes"
        mutationKey="createGameMode"
        badgeColor="green"
        allowCreate={true}
      />

      {/* Perspectives */}
      <CompactTagSelector
        label={translateUi("oyun_motorlari_afd7dd6")}
        icon="GE"
        value={normalizeToItems(formData.gameEngines || [])}
        onChange={(items) => setFormData({ ...formData, gameEngines: items })}
        placeholder={translateUi("unreal_engine_unity_source_93e7732")}
        emptyMessage={translateUi("oyun_motoru_eklenmedi_1496da1")}
        listQuery={LIST_GAME_ENGINES}
        createMutation={CREATE_GAME_ENGINE}
        queryKey="listGameEngines"
        mutationKey="createGameEngine"
        badgeColor="blue"
        allowCreate={true}
      />

      {/* Perspectives */}
      <CompactTagSelector
        label={translateUi("perspektifler_dac2765")}
        icon="👁️"
        value={normalizeToItems(formData.perspectives || [])}
        onChange={(items) => setFormData({ ...formData, perspectives: items })}
        placeholder={translateUi("birinci_sahis_ucuncu_sahis_01a08ae")}
        emptyMessage={translateUi("perspektif_eklenmedi_51a8292")}
        listQuery={LIST_PERSPECTIVES}
        createMutation={CREATE_PERSPECTIVE}
        queryKey="listPerspectives"
        mutationKey="createPerspective"
        badgeColor="purple"
        allowCreate={true}
      />

      {/* Platforms */}
      <CompactTagSelector
        label={translateUi("platformlar_ba389bc")}
        icon="🖥️"
        value={normalizeToItems(formData.platforms || [])}
        onChange={(items) => setFormData({ ...formData, platforms: items })}
        placeholder={translateUi("windows_playstation_xbox_9d57517")}
        emptyMessage={translateUi("platform_eklenmedi_22adea4")}
        listQuery={LIST_PLATFORMS}
        createMutation={CREATE_PLATFORM}
        queryKey="listPlatforms"
        mutationKey="createPlatform"
        badgeColor="blue"
        allowCreate={true}
      />

      {/* Developers */}
      <CompactTagSelector
        label={translateUi("gelistiriciler_26dd698")}
        icon="🏗️"
        value={formData.developerCompanies || []}
        onChange={(companies) => setFormData({ ...formData, developerCompanies: companies })}
        placeholder={translateUi("cd_projekt_red_rockstar_games_835c621")}
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
        label={translateUi("yayincilar_cffc0f8")}
        icon="🏢"
        value={formData.publisherCompanies || []}
        onChange={(companies) => setFormData({ ...formData, publisherCompanies: companies })}
        placeholder={translateUi("electronic_arts_ubisoft_243ea0d")}
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
