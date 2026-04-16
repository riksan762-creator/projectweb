async function askAI(){
  let input = document.getElementById("input");
  let chat = document.getElementById("chat");

  let text = input.value;
  if(!text) return;

  chat.innerHTML += "<p><b>Kamu:</b> "+text+"</p>";
  input.value = "";

  let res = await fetch("/api/ai", {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body: JSON.stringify({ message: text })
  });

  let data = await res.json();

  chat.innerHTML += "<p><b>AI:</b> "+data.candidates[0].content.parts[0].text+"</p>";
