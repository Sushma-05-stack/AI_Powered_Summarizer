const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const styleInstructions = {
    concise:  "Provide a clear and concise summary in 3-5 sentences.",
    detailed: "Provide a detailed summary covering all key points.",
    bullet:   "Summarize the content as a bullet-point list of key takeaways."
};

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

async function summarizeText(text, options = {}) {
    const { style = "concise" } = options;

    if (!genAI) {
        throw new Error("Gemini API key not configured. Set GEMINI_API_KEY in environment variables.");
    }

    const prompt = `You are a professional AI content summarizer.
${styleInstructions[style] || styleInstructions.concise}

Content to summarize:
${text.substring(0, 10000)}`;

    let lastError;

    for (const modelName of MODELS) {
        try {
            console.log(`🔄 Trying model: ${modelName}`);
            const model  = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const summary = result.response.text();

            if (!summary || summary.trim().length === 0) {
                throw new Error("Empty response from model.");
            }

            console.log(`✅ Summarized using Gemini (${modelName})`);
            return { summary: summary.trim() };

        } catch (err) {
            console.error(`⚠️  ${modelName} failed: ${err.message}`);
            lastError = err;

            // Continue to next model on quota/not-found errors
            if (
                err.message.includes("429") ||
                err.message.includes("quota") ||
                err.message.includes("404") ||
                err.message.includes("not found") ||
                err.message.includes("denied")
            ) {
                continue;
            }
            break;
        }
    }

    const isQuota = lastError?.message?.includes("429") || lastError?.message?.includes("quota");
    if (isQuota) {
        throw new Error("API quota exceeded. Please wait a few minutes and try again.");
    }

    throw new Error(`Summarization failed: ${lastError?.message}`);
}

module.exports = { summarizeText };
