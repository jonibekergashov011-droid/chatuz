import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

const firebaseConfig = {
  apiKey: "AIzaSyBQqjx5fy5b1bysvBlPUWpYCgvlU4QZ7A8",
  authDomain: "upg-chat-9643e.firebaseapp.com",
  projectId: "upg-chat-9643e",
  appId: "1:1070897730361:web:fb1ed3f8bbd642cd170ee8"
};

// CORS sozlamalari - hamma narsaga ruxsat


app.use(express.json());

// GROQ API KEY
const GROQ_API_KEY = "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";

// ==================== ASOSIY ENDPOINTLAR ====================

// 1. ROOT ENDPOINT (GET) - serverni tekshirish uchun
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "UPG CHAT backend ishlayapti",
    time: new Date().toISOString(),
    endpoints: {
      test: "/test",
      chat: "/chat (POST)"
    }
  });
});
app.use(cors({
  origin: [
    "https://ubiquitous-profiterole-1bea12.netlify.app",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
  credentials: true
}));
// 2. TEST ENDPOINT (GET) - oddiy matn qaytaradi
app.get("/test", (req, res) => {
  res.send("✅ Server ishlayapti! Test endpoint ishladi.");
});

// 3. HEALTH CHECK ENDPOINT (GET) - Render uyg'otish uchun
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// 4. CHAT ENDPOINT (POST) - asosiy chat funksiyasi
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    
    console.log("📝 Kelgan xabar:", message);

    if (!message) {
      return res.status(400).json({ 
        reply: "Xabar yuborilmagan" 
      });
    }

    // GROQ API ga so'rov
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Sen UPG CHAT AI yordamchisan. O'zbek tilida javob ber. Do'stona va foydali bo'l." },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      throw new Error(`GROQ API xatolik: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ GROQ javobi keldi");

    const reply = data.choices?.[0]?.message?.content || "Kechirasiz, javob olishda xatolik yuz berdi.";
    
    res.json({ 
      reply: reply,
      status: "success"
    });

  } catch (err) {
    console.error("❌ Server xatolik:", err.message);
    res.status(500).json({ 
      reply: "Serverda xatolik: " + err.message,
      status: "error"
    });
  }
});

// 5. 404 handler - topilmagan endpointlar uchun
app.use(cors({
  origin: [
    "https://ubiquitous-profiterole-1bea12.netlify.app",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
  credentials: true
}));

// ==================== SERVERNI ISHGA TUSHIRISH ====================

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("✅ SERVER MUVAFFAQIYATLI ISHGA TUSHDI!");
  console.log("=".repeat(50));
  console.log(`📌 PORT: ${PORT}`);
  console.log(`📍 Asosiy: http://localhost:${PORT}`);
  console.log(`📍 Test:   http://localhost:${PORT}/test`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📍 Chat:   http://localhost:${PORT}/chat (POST)`);
  console.log("=".repeat(50) + "\n");
});
