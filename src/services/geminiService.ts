import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY });

export async function getAIExplanation(route: any, score: any, disruptions: any[]) {
  try {
    const prompt = `Analyze this supply chain route decision:
      Route: ${route.name}
      Total Distance: ${route.distanceKm}km
      Computed Cost: $${score.totalCost.toFixed(2)}
      Risk Penalty: ${score.riskPenalty.toFixed(2)}
      Active Disruptions in Area: ${disruptions.map(d => d.type).join(", ")}
      
      Why was this route chosen? Provide a single-sentence professional justification (max 25 words).`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text?.trim() || "Route selected based on optimal cost-to-risk ratio.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Dynamic rerouting applied to bypass detected intersections.";
  }
}
