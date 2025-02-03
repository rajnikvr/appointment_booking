import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config(); // Load environment variables

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// Load API Keys from .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_APP_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_AUTH_KEY = process.env.WHATSAPP_AUTH_KEY;
const __dirname = path.dirname(new URL(import.meta.url).pathname);
// Google Gemini API URL
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

// Function to send a message via WhatsApp API
const sendWhatsAppMessage = async (phone, message) => {
    try {
        const data = {
            to: phone,
            message: message,
            appkey: WHATSAPP_APP_KEY,
            authkey: WHATSAPP_AUTH_KEY,
            sandbox: "false",
        };

        const response = await axios.post(WHATSAPP_API_URL, data, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        console.log("WhatsApp API Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error sending WhatsApp message:", error.response?.data || error.message);
        return { status: "error", message: "Failed to send message" };
    }
};

// Function to get an answer from Gemini AI
const askGemini = async (question) => {
    try {
        const response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: question }] }],
        });

        return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
    } catch (error) {
        console.error("Error fetching from Gemini API:", error);
        return "Sorry, an error occurred!";
    }
};

app.post("/webhook", async (req, res) => {
    console.log("Received Webhook Data:", req.body);

    const { phone, question } = req.body;
    if (!phone || !question) {
        return res.status(400).json({ error: "Phone and Question are required!" });
    }

    // Get response from Gemini
    const answer = await askGemini(question);

    // Send the answer to the user via WhatsApp
    // const whatsappResponse = await sendWhatsAppMessage(phone, answer);

    // Prepare the response data to store in the file
    const responseData = {
        phone,
        question,
        answer,
        // whatsappResponse,
        timestamp: new Date().toISOString(),
    };

    // Convert the response data to a string (JSON format for easy reading)
    const responseDataString = JSON.stringify(responseData, null, 2);

    // Use absolute path based on process.cwd()
    const filePath = path.join(process.cwd(), 'webhook_responses.txt');

    // Append the response data to the file
    fs.writeFile(filePath, responseDataString + '\n\n', (err) => {
        if (err) {
            console.error("Error writing to file:", err);
            return res.status(500).json({ error: "Failed to log webhook data" });
        }

        // Respond back with the details
        res.json({ phone, question, answer });
    });
});



// Start the server
app.listen(PORT, () => {
    console.log(`Webhook server is running on http://localhost:${PORT}`);
});

console.log("Current working directory:", process.cwd());
