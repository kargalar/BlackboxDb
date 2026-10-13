const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error('GEMINI_API_KEY is required');

async function testModel(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
  });
  console.log(`${model}: ${response.status}`);
}

testModel('gemini-2.0-flash');
testModel('gemini-2.5-flash');
testModel('gemini-3.0-flash');
testModel('gemini-2.5-flash-latest');
