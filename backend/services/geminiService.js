const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models to try in order (fallback chain) — verified against API
const MODEL_FALLBACKS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest"
];

const styleInstructions = {
    concise: "Provide a clear and concise summary in 3-5 sentences.",
    detailed: "Provide a detailed summary covering all key points.",
    bullet: "Summarize the content as a bullet-point list of key takeaways."
};

async function summarizeText(text, options = {}) {
    const { maxInputChars = 10000, style = "concise" } = options;

    const prompt = `You are a professional AI content summarizer.
${styleInstructions[style] || styleInstructions.concise}

Content to summarize:
${text.substring(0, maxInputChars)}`;

    let lastError;

    for (const modelName of MODEL_FALLBACKS) {
        try {
            console.log(`🔄 Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const summary = result.response.text();

            if (!summary || summary.trim().length === 0) {
                throw new Error("Empty response from model.");
            }

            console.log(`✅ Summarized using ${modelName}`);
            return { summary: summary.trim() };

        } catch (err) {
            console.error(`⚠️  ${modelName} failed: ${err.message}`);
            lastError = err;

            // If quota exceeded, try next model
            if (err.message.includes("429") || err.message.includes("quota")) {
                continue;
            }

            // If model not found, try next
            if (err.message.includes("404") || err.message.includes("not found")) {
                continue;
            }

            // Any other error — stop trying
            break;
        }
    }

    // All models failed — give a clear user-facing message
    const isQuota = lastError?.message?.includes("429") || lastError?.message?.includes("quota");
    if (isQuota) {
        throw new Error(
            "API quota exceeded. Your free tier limit has been reached. " +
            "Please wait a few minutes and try again, or upgrade your Google AI plan at https://ai.google.dev"
        );
    }

    throw new Error(`Summarization failed: ${lastError?.message}`);
}

module.exports = { summarizeText };
