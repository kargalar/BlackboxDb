import { formattingLocale } from './locales';

const catalogCodes: Record<string, string> = {
  english: 'en', hindi: 'hi', punjabi: 'pa', japanese: 'ja', spanish: 'es', french: 'fr',
  mandarin: 'cmn', turkish: 'tr', german: 'de', swedish: 'sv', italian: 'it', russian: 'ru',
  azerbaijani: 'az', danish: 'da', finnish: 'fi', persian: 'fa', latin: 'la', arabic: 'ar',
  greek: 'el', cantonese: 'yue', hebrew: 'he', bulgarian: 'bg', thai: 'th', polish: 'pl',
  tagalog: 'tl', hungarian: 'hu', korean: 'ko', portuguese: 'pt', dutch: 'nl', bengali: 'bn',
  icelandic: 'is', norwegian: 'no', ukrainian: 'uk', czech: 'cs', urdu: 'ur', vietnamese: 'vi',
  kurdish: 'ku', tamil: 'ta', romanian: 'ro', croatian: 'hr', malayalam: 'ml', serbian: 'sr',
  irish: 'ga', indonesian: 'id', chinese: 'zh', 'no language': 'zxx',
  chi: 'zh', fre: 'fr', ger: 'de', per: 'fa', alb: 'sq', cze: 'cs', gre: 'el',
  dut: 'nl', ice: 'is', rum: 'ro', slo: 'sk', wel: 'cy',
};

export function formatLanguageName(value: string, locale: string) {
  const key = value.trim().toLowerCase();
  const code = catalogCodes[key] ?? key;
  if (!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(code)) return value;
  return new Intl.DisplayNames([formattingLocale(locale), 'en'], {
    type: 'language', fallback: 'none',
  }).of(code) ?? value;
}
