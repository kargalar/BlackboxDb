import "dotenv/config";
import fs from "fs";
import path from "path";

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID || "";
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET || "";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE_URL = "https://api.igdb.com/v4";

async function getAccessToken(): Promise<string> {
  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error(
      "IGDB_CLIENT_ID ve IGDB_CLIENT_SECRET env değişkenleri gerekli",
    );
  }

  const params = new URLSearchParams({
    client_id: IGDB_CLIENT_ID,
    client_secret: IGDB_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Twitch OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function igdbRequest<T>(endpoint: string, body: string, token: string): Promise<T> {
  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": IGDB_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IGDB API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

async function main() {
  const csvPath = path.resolve(__dirname, "../../../oyun.csv");
  console.log(`🚀 Starting to fetch top 1000 popular games from IGDB...`);

  try {
    const token = await getAccessToken();
    const gameTitles: string[] = [];
    const limit = 100;

    interface IgdbGame {
      id: number;
      name: string;
    }

    for (let page = 0; page < 10; page++) {
      const offset = page * limit;
      console.log(`🔍 Fetching games ${offset + 1} - ${offset + limit}...`);

      const body = `
        fields name;
        where rating != null & rating_count > 50;
        sort rating desc;
        limit ${limit};
        offset ${offset};
      `;

      const results = await igdbRequest<IgdbGame[]>("games", body, token);
      if (!results || results.length === 0) {
        console.log(`  No more results found.`);
        break;
      }

      for (const g of results) {
        gameTitles.push(g.name);
      }

      // Small delay between page requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✨ Successfully fetched ${gameTitles.length} popular games.`);

    // Write to oyun.csv with "Oyun Adı" header
    const csvLines = ["Oyun Adı", ...gameTitles.map(title => `"${title.replace(/"/g, '""')}"`)];
    fs.writeFileSync(csvPath, csvLines.join("\n"), "utf-8");

    console.log(`💾 Saved ${gameTitles.length} popular games to: ${csvPath}\n`);
  } catch (error: any) {
    console.error(`💥 Error fetching games:`, error?.message || error);
  }
}

main().catch((err) => {
  console.error("💥 Global fetchPopularGames script error:", err);
});
