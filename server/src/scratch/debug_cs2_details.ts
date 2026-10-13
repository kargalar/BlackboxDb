import "dotenv/config";
import { fetchIgdbGameDetails } from "../lib/igdbFetcher";

async function main() {
    try {
        const details = await fetchIgdbGameDetails(242408);
        console.log(JSON.stringify(details, null, 2));
    } catch (error) {
        console.error(error);
    }
}

main();
