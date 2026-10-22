require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID || "";
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET || "";
if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
  throw new Error("IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required");
}

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: IGDB_CLIENT_ID,
    client_secret: IGDB_CLIENT_SECRET,
    grant_type: "client_credentials",
  });
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!response.ok) {
    throw new Error(`Twitch OAuth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function main() {
  try {
    const token = await getAccessToken();
    const collectionId = 58;
    const body = `
      fields name;
      where id = ${collectionId};
    `;

    const response = await fetch("https://api.igdb.com/v4/collections", {
      method: "POST",
      headers: {
        "Client-ID": IGDB_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: body,
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error.message);
  }
}

main();
