import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import type { GraphQLContext } from "../context";
import { bookTitleTranslations } from "./bookTranslations";
import { resolveRequestLanguage, supportedLanguages } from "./requestLanguage";
import { mapTmdbTranslations } from "./tmdb/translations";
import { resolveContentDescription, resolveContentTitle } from "../resolvers/content/ContentFieldResolver";

test("all interface languages can be selected, with English as the default", () => {
  const request = (headers: Request["headers"]) => ({ headers }) as Request;
  for (const language of supportedLanguages) {
    assert.equal(resolveRequestLanguage(request({ cookie: `NEXT_LOCALE=${language}` })), language);
  }
  assert.equal(resolveRequestLanguage(request({ "accept-language": "pt-BR;q=0.3,tr-TR;q=0,ja;q=0.9" })), "ja");
  assert.equal(resolveRequestLanguage(request({ "accept-language": "xx" })), "en");
});

test("translation fallback is field-specific and the original-title setting leaves the description localized", async () => {
  const ctx = { language: "tr" } as GraphQLContext;
  const content = {
    id: "example",
    title: "Catalog title",
    originalTitle: "Original title",
    contentTypeId: 1,
    description: "Catalog description",
    translations: [
      { language: "tr", title: "Türkçe başlık" },
      { language: "en", title: "English title", description: "English description" },
    ],
  };
  assert.equal(await resolveContentTitle(content, ctx), "Türkçe başlık");
  assert.equal(await resolveContentDescription(content, ctx), "English description");
  assert.equal(await resolveContentTitle(content, { ...ctx, language: "ja" }), "English title");
  content.translations[0].description = "Türkçe açıklama";
  assert.equal(await resolveContentTitle(content, { ...ctx, showOriginalTitles: true }), "Original title");
  assert.equal(await resolveContentDescription(content, { ...ctx, showOriginalTitles: true }), "Türkçe açıklama");
});

test("TMDB combines translated fields from available regions and retains additional languages for search", () => {
  const translations = mapTmdbTranslations({ translations: [
    { iso_639_1: "pt", iso_3166_1: "PT", data: { title: "Portugal", overview: "Descrição" } },
    { iso_639_1: "pt", iso_3166_1: "BR", data: { title: "Brasil", overview: " " } },
    { iso_639_1: "ko", iso_3166_1: "KR", data: { name: "제목" } },
    { iso_639_1: "xx", iso_3166_1: "US", data: { title: "Not a known language" } },
  ] }, { language: "ja", title: "千と千尋の神隠し" });
  assert.deepEqual(translations.find((t) => t.language === "pt"), {
    language: "pt", title: "Brasil", description: "Descrição",
  });
  assert.deepEqual(translations.find((t) => t.language === "ko"), { language: "ko", title: "제목" });
  assert.deepEqual(translations.find((t) => t.language === "ja"), {
    language: "ja", title: "千と千尋の神隠し",
  });
  assert.ok(!translations.some((t) => t.language === "xx"));
});

test("book metadata uses an edition's declared language", () => {
  assert.deepEqual(bookTitleTranslations([
    { title: "Türkçe", language: "tur" },
    { title: "English", language: "eng", description: "English description" },
    { title: "Unsupported", language: "unknown" },
  ]), [
    { language: "tr", title: "Türkçe" },
    { language: "en", title: "English", description: "English description" },
  ]);
});
