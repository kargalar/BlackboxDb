'use server';

import { headers } from 'next/headers';

export interface MovieSuggestion {
  title: string;
  year: number;
  reason: string;
}

const MAX_DESCRIPTION_LENGTH = 1_000;
const MOVIE_FINDER_WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestWindows = new Map<string, { startedAt: number; count: number }>();

async function enforceMovieFinderRateLimit(): Promise<void> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientKey = forwardedFor || requestHeaders.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const currentWindow = requestWindows.get(clientKey);

  if (!currentWindow || now - currentWindow.startedAt >= MOVIE_FINDER_WINDOW_MS) {
    requestWindows.set(clientKey, { startedAt: now, count: 1 });
  } else {
    if (currentWindow.count >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error('Film bulucu limiti doldu. Lütfen biraz sonra tekrar deneyin.');
    }
    currentWindow.count += 1;
  }

  if (requestWindows.size > 1_000) {
    for (const [key, window] of requestWindows) {
      if (now - window.startedAt >= MOVIE_FINDER_WINDOW_MS) {
        requestWindows.delete(key);
      }
    }

    while (requestWindows.size > 1_000) {
      const oldestKey = requestWindows.keys().next().value;
      if (!oldestKey) break;
      requestWindows.delete(oldestKey);
    }
  }
}

export async function findMovies(description: string): Promise<MovieSuggestion[]> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  const normalizedDescription = description.trim();
  if (!normalizedDescription) {
    throw new Error('Lütfen filmin açıklamasını yazın.');
  }
  if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Açıklama en fazla ${MAX_DESCRIPTION_LENGTH} karakter olabilir.`);
  }
  await enforceMovieFinderRateLimit();

  const prompt = `Sen bir film bulucu asistansın. Kullanıcı bir filmi hatırladığı kadarıyla tarif ediyor. 
Bu tarife uyan olası filmleri tahmin et. 
Sadece JSON formatında cevap ver. 
Döneceğin JSON formatı şu şekilde bir liste olmalı:
[
  {
    "title": "Filmin Orijinal Adı",
    "year": 2010,
    "reason": "Neden bu filmi önerdiğinize dair kısa bir açıklama"
  }
]
Maksimum 5 film öner. Sadece JSON dön, markdown veya başka bir metin ekleme.
İşte kullanıcının tarifi: "${normalizedDescription}"`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: 'MINIMAL',
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error('Film bulma işlemi sırasında bir hata oluştu.');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Sonuç bulunamadı.');
  }

  try {
    return JSON.parse(text) as MovieSuggestion[];
  } catch (e) {
    console.error('JSON parsing failed:', text);
    throw new Error('Sonuçlar işlenirken bir hata oluştu.');
  }
}

export async function fetchTmdbScreenshots(tmdbId: number): Promise<string[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}/images`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const backdrops = data.backdrops || [];
    // Sort by vote average and take first 5 images
    return backdrops
      .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 5)
      .map((b: any) => `https://image.tmdb.org/t/p/w1280${b.file_path}`);
  } catch (error) {
    console.error('Error fetching TMDB screenshots:', error);
    return [];
  }
}
