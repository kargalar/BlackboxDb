import { fetchBookDetails } from "../lib/googleBooksFetcher";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function run() {
  console.log("Starting test fetch for Kürk Mantolu Madonna...");
  const { searchBooks } = require("../lib/googleBooksFetcher");
  const results = await searchBooks("Kürk Mantolu Madonna", 0, 5);
  console.log("Search results:", results.map((r: any) => ({ sourceId: r.sourceId, title: r.title })));
  
  if (results.length > 0) {
    const targetId = results[0].sourceId;
    console.log(`\nFetching details for: ${results[0].title} (ID: ${targetId})...`);
    const details = await fetchBookDetails(targetId);
    console.log("\nDetails editions count:", details.editions?.length || 0);
    console.log("Editions:", details.editions?.slice(0, 5));
    console.log("Release Date:", details.releaseDate);
  }
}

run().catch(console.error);

