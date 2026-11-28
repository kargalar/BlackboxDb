import type { Request } from "express";
import { getCookie } from "./authCookies";

export const supportedLanguages = [
  "en", "zh", "hi", "es", "ar", "fr", "bn", "pt", "id", "ur",
  "ru", "de", "ja", "pcm", "arz", "tr",
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

const languageAliases: Record<string, SupportedLanguage> = {
  eng: "en", zho: "zh", chi: "zh", cmn: "zh", hin: "hi", spa: "es",
  ara: "ar", fra: "fr", fre: "fr", ben: "bn", por: "pt", ind: "id",
  urd: "ur", rus: "ru", deu: "de", ger: "de", jpn: "ja", tur: "tr",
};

export function normalizeLanguage(value: string | undefined): SupportedLanguage | undefined {
  const language = value?.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLanguages.find((supported) => supported === language) ??
    (language && Object.hasOwn(languageAliases, language) ? languageAliases[language] : undefined);
}

export function resolveRequestLanguage(request: Request): SupportedLanguage {
  const cookie = normalizeLanguage(getCookie(request, "NEXT_LOCALE"));
  if (cookie) return cookie;
  return (request.headers["accept-language"]?.split(",") ?? [])
    .map((entry) => {
      const [value, quality] = entry.trim().split(/;\s*q=/i);
      return { language: normalizeLanguage(value), weight: quality === undefined ? 1 : Number(quality) };
    })
    .filter((entry) => entry.language && entry.weight > 0 && entry.weight <= 1)
    .sort((a, b) => b.weight - a.weight)[0]?.language ?? "en";
}
