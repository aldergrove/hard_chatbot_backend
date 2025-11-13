// server.js
import express from "express";
import cors from "cors";

// HUOM: aseta nämä ympäristömuuttujiin palvelimella
// HF_TOKEN = Hugging Face access token
// MODEL_ID = valittu malli, esim. "google/gemma-2-2b-it"
const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_ID = process.env.MODEL_ID || "HuggingFaceH4/zephyr-7b-beta";

if (!HF_TOKEN) {
    console.error("Puuttuva HF_TOKEN. Aseta Hugging Face -token ympäristömuuttujaan.");
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

        // Yksinkertainen “chat”-prompt
        const prompt =
            "You are a helpful Finnish customer support chatbot called hard_chatbot. " +
            "Answer clearly and politely. \n\n" +
            "User: " + userMessage + "\n" +
            "Assistant:";

        const apiUrl = `https://router.huggingface.co/hf-inference/models/${MODEL_ID}`;

        const hfResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: prompt,
                options: { wait_for_model: true },
                parameters: {
                    max_new_tokens: 120,
                    temperature: 0.7,
                    top_p: 0.9
                }
            })
        });


        if (!hfResponse.ok) {
            const errorText = await hfResponse.text();
            console.error("HF API -virhe:", errorText);
            return res.status(500).json({ error: "AI-kutsu epäonnistui" });
        }

        const result = await hfResponse.json();

        // Tyypillinen muoto: [{ generated_text: "koko prompt + generoitu teksti" }]
        let fullText = "";
        if (Array.isArray(result) && result[0]?.generated_text) {
            fullText = result[0].generated_text;
        } else {
            console.error("Yllättävä HF-tulos:", result);
            return res.status(500).json({ error: "AI-vastausta ei voitu tulkita" });
        }

        // Erotetaan varsinainen vastaus “Assistant:” -kohdasta eteenpäin
        let reply = fullText.split("Assistant:").pop().trim();
        if (!reply) {
            reply = fullText.trim();
        }

        res.json({ reply });
    } catch (err) {
        console.error("Virhe /api/chat -reitillä:", err);
        res.status(500).json({ error: "Sisäinen palvelinvirhe" });
    }
});

// Portti ympäristömuuttujasta (esim. Render/Vercel) tai 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`hard_chatbot backend kuuntelee portissa ${PORT}`);
});
