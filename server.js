import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = "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";

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "UPG CHAT backend ishlayapti" });
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Javob olishda xatolik";
    res.json({ reply });
    
  } catch (err) {
    res.json({ reply: "Xatolik: " + err.message });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`✅ Server ${PORT} da ishlayapti`));