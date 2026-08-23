import { GoogleGenAI } from '@google/genai';

// Initialize the SDK. It automatically picks up GEMINI_API_KEY from the environment.
const ai = new GoogleGenAI({});

export const generatePreVisitSummary = async (symptoms: string) => {
  const prompt = `Analyse these symptoms and return a JSON object with: 
  - urgencyLevel: "Low" | "Medium" | "High"
  - chiefComplaint: string
  - suggestedQuestions: string[] (three suggested questions for the doctor)
  
  Symptoms: ${symptoms}
  
  Return strictly JSON without markdown blocks.`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    // Parse the JSON. In production we might want more robust error handling
    const resultText = response.text || "{}";
    const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("LLM Pre-visit Error:", error);
    // Graceful fallback
    return {
      urgencyLevel: "Medium",
      chiefComplaint: symptoms.substring(0, 50) + "...",
      suggestedQuestions: ["Can you describe when the symptoms started?", "Are you taking any medication?", "Has this happened before?"]
    };
  }
};

export const generatePostVisitSummary = async (notes: string) => {
  const prompt = `Convert these clinical notes into a patient-friendly summary.
  Return a JSON object with:
  - patientFriendlySummary: string (easy to understand explanation)
  - medicationSchedule: string[] (list of medications and when to take them)
  - followUpSteps: string[] (what the patient should do next)
  
  Clinical Notes: ${notes}
  
  Return strictly JSON without markdown blocks.`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const resultText = response.text || "{}";
    const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("LLM Post-visit Error:", error);
    // Graceful fallback when API key is missing
    const prescriptionMatch = notes.split('\\nPrescription: ');
    const fallbackMeds = prescriptionMatch.length > 1 && prescriptionMatch[1].trim() 
      ? [prescriptionMatch[1].trim()] 
      : ["Please refer to your physical prescription."];

    return {
      patientFriendlySummary: "Your doctor has recorded the visit notes.",
      medicationSchedule: fallbackMeds,
      followUpSteps: ["Follow up as directed by your doctor."]
    };
  }
};
