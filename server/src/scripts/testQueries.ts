// Use native global fetch
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1";

async function testQuery(cleanTitle: string, author: string) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  console.log("API Key loaded:", apiKey ? "YES (starts with " + apiKey.substring(0, 5) + ")" : "NO");

  // Test 1: strict intitle + inauthor
  const q1 = `intitle:"${cleanTitle}"+inauthor:"${author}"`;
  
  // Test 2: general title and author terms (no strict fields)
  const q2 = `"${cleanTitle}" "${author}"`;
  
  // Test 3: intitle without quotes + inauthor
  const q3 = `intitle:${cleanTitle}+inauthor:${author}`;

  // Test 4: title + author space-separated
  const q4 = `${cleanTitle} ${author}`;

  // Test 5: title only
  const q5 = `Bizim Büyük Çaresizliğimiz`;

  const queries = [
    { name: "Strict intitle/inauthor", q: q1 },
    { name: "Quotes title & author", q: q2 },
    { name: "Looser intitle/inauthor", q: q3 },
    { name: "Plain title & author", q: q4 },
    { name: "Title only", q: q5 }
  ];

  for (const item of queries) {
    let url = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(item.q)}&printType=books&maxResults=10`;
    if (apiKey) {
      url += `&key=${apiKey}`;
    }
    console.log(`\n--- Running: ${item.name} ---`);
    console.log(`URL: ${url.replace(apiKey || "", "API_KEY_HIDDEN")}`);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const items = data.items || [];
        console.log(`Found: ${items.length} items.`);
        for (const it of items) {
          const info = it.volumeInfo;
          console.log(` - ID: ${it.id} | Title: "${info.title}" | Author: ${info.authors?.join(", ")} | Published: ${info.publishedDate} | ISBN: ${info.industryIdentifiers?.map((x: any) => x.identifier).join(", ")}`);
        }
      } else {
        console.log(`Failed: ${res.status}`);
      }
    } catch (e) {
      console.log(`Error:`, e);
    }
    // Delay 1.5 seconds between queries
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

testQuery("Kürk Mantolu Madonna", "Sabahattin Ali");
