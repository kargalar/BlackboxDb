'use client';

import { Save, Star } from 'lucide-react';
import { DIFFICULTY_LABELS } from './quizTypes';
import type { QuizSettings } from './quizTypes';
import { useTranslations } from 'next-intl';

interface QuizSettingsTabProps {
  currentSettings: Record<string, any>;
  updatingSettings: boolean;
  onSettingChange: (field: string, value: any) => void;
  onSaveSettings: () => void;
}

const LEVEL_COLORS = [
  'text-green-400',
  'text-lime-400',
  'text-yellow-400',
  'text-orange-400',
  'text-red-400',
];

const LEVEL_FIELDS = [
  'pointsLevel1',
  'pointsLevel2',
  'pointsLevel3',
  'pointsLevel4',
  'pointsLevel5',
];

const LEVEL_DEFAULTS = [10, 15, 25, 40, 50];
const LEVEL_MAX = [50, 100, 200, 350, 500];

export function QuizSettingsTab({
  currentSettings,
  updatingSettings,
  onSettingChange,
  onSaveSettings,
}: QuizSettingsTabProps) {
  const t = useTranslations('AdminQuizPage');

  console.log('🎨 [QuizSettingsTab] Rendering with settings:', currentSettings);

  return (
    <div className="bg-neutral-900/50 rounded-2xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quiz Status */}
        <div className="col-span-full flex items-center justify-between p-4 bg-neutral-800/70 rounded-xl border border-neutral-700/40">
          <div>
            <h3 className="font-semibold text-white">{t('settingsTab.statusTitle')}</h3>
            <p className="text-sm text-gray-400">{t('settingsTab.statusDesc')}</p>
          </div>
          <button
            onClick={() => onSettingChange('isActive', !currentSettings.isActive)}
            className={`
              relative w-14 h-7 rounded-full transition-colors
              ${currentSettings.isActive ? 'bg-green-500' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
              absolute top-1 w-5 h-5 rounded-full bg-white transition-transform
              ${currentSettings.isActive ? 'left-8' : 'left-1'}
            `}
            />
          </button>
        </div>

        {/* Points */}
        <div className="col-span-full p-4 bg-neutral-800/70 rounded-xl border border-neutral-700/40">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-white">{t('settingsTab.pointsTitle')}</h3>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {DIFFICULTY_LABELS.map((label, index) => {
              const translatedLabel =
                index === 0
                  ? t('difficulty.veryEasy')
                  : index === 1
                    ? t('difficulty.easy')
                    : index === 2
                      ? t('difficulty.medium')
                      : index === 3
                        ? t('difficulty.hard')
                        : t('difficulty.veryHard');
              return (
                <PointLevelInput
                  key={index}
                  label={translatedLabel}
                  levelIndex={index}
                  value={currentSettings[LEVEL_FIELDS[index]] || LEVEL_DEFAULTS[index]}
                  maxValue={LEVEL_MAX[index]}
                  colorClass={LEVEL_COLORS[index]}
                  onChange={(value) => onSettingChange(LEVEL_FIELDS[index], value)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onSaveSettings}
          disabled={updatingSettings}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
        >
          <Save className="w-5 h-5" />
          {updatingSettings ? t('settingsTab.saving') : t('settingsTab.save')}
        </button>
      </div>
    </div>
  );
}

interface PointLevelInputProps {
  label: string;
  levelIndex: number;
  value: number;
  maxValue: number;
  colorClass: string;
  onChange: (value: number) => void;
}

function PointLevelInput({
  label,
  levelIndex,
  value,
  maxValue,
  colorClass,
  onChange,
}: PointLevelInputProps) {
  return (
    <div>
      <label className={`block text-sm ${colorClass} mb-2`}>
        {label} ({levelIndex + 1})
      </label>
      <input
        type="number"
        min="1"
        max={maxValue}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full px-3 py-2 bg-gray-600 rounded-lg text-white text-center text-lg font-bold"
      />
    </div>
  );
}
