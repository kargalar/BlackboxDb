// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { localeNames } from './locales';

type Messages = { [key: string]: Messages | string };
const messagesDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../messages');

function readCatalog(locale: string): Messages {
  return JSON.parse(readFileSync(resolve(messagesDirectory, `${locale}.json`), 'utf8'));
}

function flatten(messages: Messages, parent = ''): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = parent ? `${parent}.${key}` : key;
    return typeof value === 'string' ? [[path, value]] : flatten(value, path);
  });
}

function argumentsOf(elements: MessageFormatElement[]): string[] {
  return elements.flatMap((element) => {
    if ('options' in element) {
      return [element.value, ...Object.values(element.options).flatMap(({ value }) => argumentsOf(value))];
    }
    if ('children' in element) return argumentsOf(element.children);
    if (element.type >= 1 && element.type <= 4 && 'value' in element) return [element.value];
    return [];
  });
}

describe('interface localization', () => {
  const english = new Map(flatten(readCatalog('en')));
  it.each(Object.keys(localeNames))('%s covers every message and preserves its interpolation values', (locale) => {
    const dictionary = new Map(flatten(readCatalog(locale)));
    expect([...dictionary.keys()].sort()).toEqual([...english.keys()].sort());
    for (const [key, reference] of english) {
      const actual = dictionary.get(key);
      if (reference.trim()) expect(actual?.trim(), key).toBeTruthy();
      expect(new Set(argumentsOf(parse(actual!))), key).toEqual(new Set(argumentsOf(parse(reference))));
    }
  });
});
