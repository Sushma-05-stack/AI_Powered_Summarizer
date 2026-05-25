const Anthropic = require("@anthropic-ai/sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const styleInstructions = {
    concise: "Provide a clear and concise summary in 3-5 sentences.",
    detailed: "Provide a detailed summary covering all key points.",
    bullet: "Summarize the content as a bullet-point list of key takeaways."
};

// ── Claude summarization ───────────────────────────────────────
async function summarizeWithClaude(text, style = "concise") {
    const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [
            {
                role: "user",
                content: `You are a professional AI content summarizer.
${styleInstructions[style] || styleInstructions.concise}

Content to summarize:
${text.substring(0, 10000)}`
            }
        ]
    });

    const summary = message.content[0]?.text;
    if (!summary || summary.trim().length === 0) {
        throw new Error("Claude returned an empty response.");
    }

    console.log("✅ Summarized using Claude (claude-3-haiku)");
    return { summary: summary.trim() };
}

// ── Gemini summarization (fallback) ───────────────────────────
async function summarizeWithGemini(text, style = "concise") {
    if (!genAI) throw new Error("Gemini API key not configured.");

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
    let lastError;

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const prompt = `You are a professional AI content summarizer.
${styleInstructions[style] || styleInstructions.concise}

Content to summarize:
${text.substring(0, 10000)}`;

            const result = await model.generateContent(prompt);
            const summary = result.response.text();

            if (!summary || summary.trim().length === 0) {
                throw new Error("Empty response.");
            }

            console.log(`✅ Summarized using Gemini (${modelName})`);
            return { summary: summary.trim() };

        } catch (err) {
            console.error(`⚠️  Gemini ${modelName} failed: ${err.message}`);
            lastError = err;
            if (err.message.includes("429") || err.message.includes("quota") ||
                err.message.includes("404") || err.message.includes("not found")) {
                continue;
            }
            break;
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}

// ── Main export: Claude first, Gemini fallback ─────────────────
async function summarizeText(text, options = {}) {
    const { style = "concise" } = options;

    // Try Claude first
    if (process.env.CLAUDE_API_KEY) {
        try {
            return await summarizeWithClaude(text, style);
        } catch (err) {
            console.error("⚠️  Claude failed:", err.message);
        }
    }

    // Fall back to Gemini
    if (process.env.GEMINI_API_KEY) {
        try {
            return await summarizeWithGemini(text, style);
        } catch (err) {
            console.error("⚠️  Gemini failed:", err.message);
        }
    }

    throw new Error("All summarization providers failed. Please check your API keys.");
}

module.exports = { summarizeText };
