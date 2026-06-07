async function testServer() {
  console.log("Sending request to http://localhost:3000/api/check-answer...");
  try {
    const response = await fetch('http://localhost:3000/api/check-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: "Каковы три базовых свойства информации в триаде информационной безопасности (ИБ)?",
        etalon: "Конфиденциальность, Целостность и Доступность — так называемая триада CIA...",
        userQuestion: "Почему доступность так важна?"
      })
    });

    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

testServer();
