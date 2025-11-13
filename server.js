// server.js
import express from "express";
import cors from "cors";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

if (!GROQ_API_KEY) {
    console.error("Puuttuva GROQ_API_KEY. Aseta Groq API -avain ympäristömuuttujaan.");
    process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
    try {
        const userMessage = (req.body.message || "").toString();

        if (!userMessage) {
            return res.status(400).json({ error: "message puuttuu" });
        }

        const messages = [
            {
                role: "system",
                content:
                    "You are a helpful Finnish customer support chatbot called hard_chatbot. " +
                    "Answer clearly, concisely and politely in Finnish."
            },
            {
                role: "user",
                content: userMessage
            }
        ];

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages,
                    max_tokens: 300,
                    temperature: 0.7
                })
            }
        );

        if (!response.ok) {
            const txt = await response.text();
            console.error("Groq API -virhe:", txt);
            return res.status(500).json({ error: "AI-kutsu epäonnistui" });
        }

        const data = await response.json();

        const reply =
            data.choices?.[0]?.message?.content?.trim() ||
            "En saanut vastausta AI-mallilta.";

        res.json({ reply });
    } catch (err) {
        console.error("Virhe /api/chat -reitillä:", err);
        res.status(500).json({ error: "Sisäinen palvelinvirhe" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`hard_chatbot backend kuuntelee portissa ${PORT}`);
});
