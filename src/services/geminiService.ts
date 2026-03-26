import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  /**
   * Generates test cases based on API specification content.
   */
  generateTestCases: async (specContent: string): Promise<string | undefined> => {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on the following API specification, generate a set of comprehensive test cases:
        
        ${specContent}
        
        Please provide the output in a structured format, including test case name, description, method, endpoint, and expected assertions.`,
        config: {
          systemInstruction: "You are an expert API test engineer specializing in autonomous test generation using LLMs.",
        },
      });
      return response.text;
    } catch (error) {
      console.error("Error generating test cases:", error);
      throw error;
    }
  },

  /**
   * Explains a test failure and suggests a fix.
   */
  explainFailure: async (errorLog: string, codeSnippet: string): Promise<string | undefined> => {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following test failure and suggest a resolution:
        
        Error Log:
        ${errorLog}
        
        Code Snippet:
        ${codeSnippet}
        
        Provide a root cause analysis and a corrected code snippet.`,
        config: {
          systemInstruction: "You are a senior QA automation engineer with deep expertise in root cause analysis.",
        },
      });
      return response.text;
    } catch (error) {
      console.error("Error explaining failure:", error);
      throw error;
    }
  },

  /**
   * Suggests test execution order based on endpoint dependencies.
   */
  suggestExecutionOrder: async (endpoints: any[]): Promise<string | undefined> => {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Determine the optimal test execution order for the following endpoints based on their likely dependencies:
        
        ${JSON.stringify(endpoints, null, 2)}
        
        Explain the reasoning for the suggested order.`,
        config: {
          systemInstruction: "You are a test architect specializing in dependency analysis and execution optimization.",
        },
      });
      return response.text;
    } catch (error) {
      console.error("Error suggesting execution order:", error);
      throw error;
    }
  }
};
