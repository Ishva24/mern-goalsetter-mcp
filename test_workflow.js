const fs = require('fs');
const path = require('path');

async function run() {
  let output = "==== STARTING END TO END TEST ====\n";
  const log = (msg) => { console.log(msg); output += msg + "\n"; };

  try {
    log("1. Registering new user to get JWT...");
    const userRes = await fetch("http://127.0.0.1:5000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TestUser",
        email: "test" + Date.now() + "@test.com",
        password: "password123"
      })
    });
    
    if (!userRes.ok) {
       log("Failed to register user: " + await userRes.text());
       fs.writeFileSync(path.join(__dirname, 'out2.txt'), output);
       process.exit(1);
    }
    
    const userData = await userRes.json();
    const token = userData.token;
    log("-> Got Token Successfully!");
    
    log("\n2. Calling /api/chat to CREATE a goal via OpenRouter LLM...");
    const chatRes = await fetch("http://127.0.0.1:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: "Create a goal to learn Advanced Node.js proxy routing"
      })
    });
    
    const chatData = await chatRes.json();
    log("-> LLM Response:");
    log(JSON.stringify(chatData, null, 2));
    
    log("\n3. Calling /api/chat to LIST goals via OpenRouter LLM...");
    const getRes = await fetch("http://127.0.0.1:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: "List all my goals from the database"
      })
    });
    
    const getData = await getRes.json();
    log("-> LLM Response:");
    log(JSON.stringify(getData, null, 2));
    log("\n==== TEST COMPLETED ====");
  } catch (err) {
    log("\n==== TEST FAILED ====\n" + err.message);
  }

  // Write the output to a file so we can read it reliably
  fs.writeFileSync(path.join(__dirname, 'out2.txt'), output);
}

run();
