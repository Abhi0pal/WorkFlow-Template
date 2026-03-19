import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini lazily to ensure environment variables are loaded
let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing. Please check your environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export const documentSchema = {
  type: Type.OBJECT,
  properties: {
    project_name: {
      type: Type.STRING,
      description: "The name of the software project",
    },
    purpose: {
      type: Type.STRING,
      description: "The primary purpose and objectives of the software",
    },
    scope: {
      type: Type.STRING,
      description: "The scope of the project, what it will and will not do",
    },
    functional_requirements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          description: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
        }
      },
      description: "List of functional requirements"
    },
    non_functional_requirements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Performance, Security, Usability, etc." },
          description: { type: Type.STRING }
        }
      },
      description: "List of non-functional requirements"
    },
    workflow_steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step_number: { type: Type.INTEGER },
          action: { type: Type.STRING },
          actor: { type: Type.STRING },
          expected_result: { type: Type.STRING },
          details: { type: Type.STRING, description: "Additional details or notes about this step" }
        }
      },
      description: "Sequence of steps in the main system workflow"
    },
    action_matrix: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          user: { type: Type.STRING },
          role_type: { type: Type.STRING },
          action_allowed: { type: Type.STRING },
          startpoint: { type: Type.STRING },
          endpoint: { type: Type.STRING },
          sla: { type: Type.STRING, description: "Service Level Agreement in days or hours" },
          form_type_id: { type: Type.STRING },
          jurisdiction: { type: Type.STRING },
          conditions: { type: Type.STRING }
        }
      },
      description: "Detailed action matrix showing roles, actions, and flow constraints"
    },
    user_stories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "User stories in 'As a... I want... so that...' format"
    }
  },
  required: ["project_name", "purpose", "functional_requirements", "workflow_steps"],
};

export async function extractStructuredData(content: string | { data: string, mimeType: string }) {
  const ai = getGenAI();
  const model = "gemini-3-flash-preview";
  
  const parts: any[] = [];
  
  if (typeof content === 'string') {
    parts.push({
      text: `Analyze the following document and extract information to create a Software Requirements Specification (SRS). Return a JSON object following the specified schema.\n\nDocument Text:\n${content.substring(0, 30000)}`
    });
  } else {
    parts.push({
      inlineData: {
        data: content.data,
        mimeType: content.mimeType
      }
    });
    parts.push({
      text: "Analyze the attached document and extract information to create a Software Requirements Specification (SRS). Return a JSON object following the specified schema."
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: documentSchema,
    },
  });

  return JSON.parse(response.text || "{}");
}

/**
 * Transforms the extracted JSON into a generic SRS template format.
 */
export function transformToTemplate(extractedData: any) {
  return {
    srs_metadata: {
      title: `SRS for ${extractedData.project_name || "New Project"}`,
      version: "1.0.0",
      status: "Draft",
      generated_at: new Date().toISOString()
    },
    introduction: {
      purpose: extractedData.purpose || "Not specified",
      scope: extractedData.scope || "Not specified",
      definitions: ["SRS: Software Requirements Specification"]
    },
    functional_spec: {
      requirements: extractedData.functional_requirements || [],
      user_stories: extractedData.user_stories || []
    },
    non_functional_spec: {
      requirements: extractedData.non_functional_requirements || []
    },
    system_workflow: {
      steps: extractedData.workflow_steps || []
    },
    action_matrix: extractedData.action_matrix || []
  };
}
