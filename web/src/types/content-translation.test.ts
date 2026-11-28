import { describe, expect, it } from 'vitest';
import { changedContentTranslations, mergeContentTranslations } from './content-translation';

describe('content translations', () => {
  it('sends only the edited fields and languages', () => {
    const previous = [
      { language: 'tr', title: 'Başlık', description: 'Açıklama' },
      { language: 'en', title: 'Title', description: 'Description' },
    ];
    expect(changedContentTranslations(previous, [
      { language: 'en', title: 'Title', description: ' Description ' },
      { language: 'tr', title: 'Yeni başlık', description: '' },
      { language: 'es', description: 'Descripción' },
    ])).toEqual([
      { language: 'tr', title: 'Yeni başlık', description: null },
      { language: 'es', description: 'Descripción' },
    ]);
  });

  it('fills missing text using provider data without replacing an existing translation', () => {
    expect(mergeContentTranslations([{ language: 'tr', title: 'Yerel başlık' }], [
      { language: 'tr', title: 'Sağlayıcı başlığı', description: 'Açıklama' },
      { language: 'en', title: 'English title' },
    ])).toEqual([
      { language: 'en', title: 'English title' },
      { language: 'tr', title: 'Yerel başlık', description: 'Açıklama' },
    ]);
  });
});
