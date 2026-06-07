// Using native global fetch


const AITUNNEL_KEY = "sk-aitunnel-vdiSCwtDvixzAeIPYo58O7dZ9UpdBO9R";

async function test() {
  console.log("Testing AITunnel with model 'deepseek-v4-flash'...");
  try {
    const response = await fetch('https://api.aitunnel.ru/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AITUNNEL_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'user', content: 'Say hello and return a JSON with a single field "greeting".' }
        ],
        response_format: { type: 'json_object' }
      })
    });

    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
