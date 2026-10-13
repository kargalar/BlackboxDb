const IGDB_CLIENT_ID = "qy1b1en999tbz83byfq99pqjfwz82v";
const IGDB_CLIENT_SECRET = "lfo0jw3qx9l4tcfx8dfcy9v7r2j6k2";

async function getAccessToken() {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
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

    const response = await fetch('https://api.igdb.com/v4/collections', {
      method: 'POST',
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: body
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error.message);
  }
}

main();
