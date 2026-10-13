const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error('GEMINI_API_KEY is required');

async function listModels() {
  let url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  let allModels = [];
  
  while (url) {
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      allModels = allModels.concat(data.models.map(m => m.name));
    }
    if (data.nextPageToken) {
      url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}&pageToken=${data.nextPageToken}`;
    } else {
      url = null;
    }
  }
  console.log(allModels.filter(m => m.includes('3')));
}

listModels();
