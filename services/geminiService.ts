
import { GoogleGenAI, Type } from "@google/genai";
import { Course } from "../types";

export const parseTrainingDataWithGemini = async (textInput: string): Promise<Partial<Course>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze the following unstructured text describing training courses.
    Extract the training details into a structured JSON array.
    
    Current Date for reference: ${new Date().toISOString().split('T')[0]}

    The fields required are:
    - name (string)
    - company (string, try to extract if mentioned, e.g. "神資", "神耀", "新達")
    - department (string, e.g. "600-數位科技事業群")
    - objective (string, infer if not explicit)
    - startDate (string, YYYY-MM-DD)
    - endDate (string, YYYY-MM-DD)
    - time (string, e.g. "09:00-17:00")
    - duration (number, hours)
    - expectedAttendees (number)
    - instructor (string)
    - instructorOrg (string)
    - cost (number)
    - trainingType (string, either "Internal" or "External". Infer based on context. "內訓"->Internal, "外訓"->External)
    - trainees (string, if External, list the names of people attending, comma separated)
    
    If a field is missing, make a reasonable guess or leave it as an empty string/0 based on context.
    For 'cost', strictly extract the number.
    
    Input Text:
    ${textInput}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              company: { type: Type.STRING },
              department: { type: Type.STRING },
              objective: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              time: { type: Type.STRING },
              duration: { type: Type.NUMBER },
              expectedAttendees: { type: Type.NUMBER },
              instructor: { type: Type.STRING },
              instructorOrg: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              trainingType: { type: Type.STRING, enum: ["Internal", "External"] },
              trainees: { type: Type.STRING },
            },
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) return [];
    
    const parsed = JSON.parse(resultText);
    
    // Add default fields that AI might not generate
    return parsed.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      actualAttendees: 0,
      satisfaction: 0,
      status: 'Planned',
      createdBy: 'HR',
      trainingType: item.trainingType || 'Internal'
    }));

  } catch (error) {
    console.error("Error parsing with Gemini:", error);
    throw error;
  }
};
