import "dotenv/config";
import fs from "fs";
import path from "path";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const TMDB_HEADERS = {
  Authorization: `Bearer ${TMDB_API_KEY}`,
  "Content-Type": "application/json",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const csvPath = path.resolve(__dirname, "../../../film.csv");
  console.log(`🚀 Starting to fetch top 1000 popular movies from TMDB...`);

  const movieTitles: string[] = [];

  for (let page = 1; page <= 50; page++) {
    console.log(`🔍 Fetching page ${page}/50...`);
    const url = `${TMDB_BASE_URL}/movie/popular?language=en-US&page=${page}`;

    try {
      const response = await fetch(url, { headers: TMDB_HEADERS });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as {
        results: Array<{ title: string }>;
      };

      if (data.results && data.results.length > 0) {
        for (const item of data.results) {
          if (item.title) {
            movieTitles.push(item.title);
          }
        }
      }
    } catch (error: any) {
      console.error(`💥 Error fetching page ${page}:`, error?.message || error);
    }

    // Delay a bit to respect TMDB rate limits
    await delay(100);
  }

  console.log(
    `✨ Successfully fetched ${movieTitles.length} popular movie titles.`,
  );

  // Write to film.csv
  const csvLines = [
    "Film Adı",
    ...movieTitles.map((title) => `"${title.replace(/"/g, '""')}"`),
  ];
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf-8");

  console.log(`💾 Saved ${movieTitles.length} movie titles to: ${csvPath}\n`);
}

main().catch((err) => {
  console.error("💥 Global fetchPopularMovies script error:", err);
});
