
import { v4 as uuidv4 } from 'uuid';
import { ensureNumber, ensureString, ensureArray } from './type-correction';
import { safelyToArray } from './iterableUtils';
import { FileData } from './fileUtils';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  avatar: string;
  capabilities: string[];
  provider?: string;
  requiresKey?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
}

// Define available AI models
export const AI_MODELS: AIModel[] = [
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "Advanced AI for complex tasks and detailed analysis",
    avatar: "🧠",
    capabilities: ["Data analysis", "Context understanding", "Complex reasoning"],
    provider: "OpenAI",
    requiresKey: true
  },
  {
    id: "gpt-3.5",
    name: "GPT-3.5",
    description: "Fast and efficient AI for general purpose tasks",
    avatar: "⚡",
    capabilities: ["Quick responses", "General knowledge", "Basic analysis"],
    provider: "OpenAI",
    requiresKey: true
  },
  {
    id: "claude-3",
    name: "Claude 3",
    description: "Anthropic's AI assistant with strong reasoning abilities",
    avatar: "🔮",
    capabilities: ["Natural language", "Reasoning", "Creative content"],
    provider: "Anthropic",
    requiresKey: true
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    description: "Large context language model with strong capabilities",
    avatar: "🌪️",
    capabilities: ["Context handling", "Reasoning", "Summarization"],
    provider: "Mistral AI",
    requiresKey: true
  },
  {
    id: "local-model",
    name: "Local AI",
    description: "Processes data locally in your browser",
    avatar: "💻",
    capabilities: ["Basic analysis", "Fast responses", "No API key needed"],
    provider: "Local",
    requiresKey: false
  }
];

// Export models as an alias for AI_MODELS to match AIInteraction.tsx
export const models = AI_MODELS;

// Get model info by ID
export const getModelInfo = (modelId: string): AIModel => {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model || AI_MODELS[0]; // Default to first model if not found
};

// Create a new message
export const createMessage = (
  role: "user" | "assistant" | "system", 
  content: string,
  model?: string
): Message => {
  return {
    id: uuidv4(),
    role,
    content: ensureString(content),
    timestamp: Date.now(),
    model
  };
};

// Calculate token estimate (simplified)
export const estimateTokens = (text: string): number => {
  // A very rough estimate: ~4 chars per token
  if (!text) return 0;
  
  const safeText = ensureString(text);
  const charCount = safeText.length;
  return Math.ceil(charCount / 4);
};

// Process data with local AI (basic implementation)
export const processLocalAI = async (userQuery: string, file: FileData | null): Promise<string> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!file) {
    return "Please select a data file to analyze.";
  }
  
  // Ensure file data is always an array
  const safeData = safelyToArray(file.data || []);
  
  // Basic data analysis simulation
  const rowCount = safeData.length;
  const colCount = file.columns.length;
  
  const lowercaseQuery = userQuery.toLowerCase();
  
  // Simple query response logic
  if (lowercaseQuery.includes("how many rows")) {
    return `The file "${file.name}" contains ${rowCount} rows of data.`;
  } else if (lowercaseQuery.includes("how many columns") || lowercaseQuery.includes("what columns")) {
    return `The file "${file.name}" contains ${colCount} columns: ${file.columns.join(", ")}.`;
  } else if (lowercaseQuery.includes("summary") || lowercaseQuery.includes("describe")) {
    return `Here's a summary of "${file.name}":\n- Rows: ${rowCount}\n- Columns: ${colCount}\n- Column names: ${file.columns.join(", ")}\n\nTo perform more specific analysis, try asking questions about particular columns or values.`;
  }
  
  // Default response
  return `I've analyzed "${file.name}" (${rowCount} rows × ${colCount} columns). What specific information would you like to know about this data?`;
};

// Simulate AI response for cloud models
export const simulateAIResponse = async (
  userQuery: string, 
  file: FileData | null, 
  model: AIModel,
  apiKey: string | null
): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (!apiKey) {
    throw new Error(`Please provide a valid ${model.provider} API key in the settings tab.`);
  }
  
  if (!file) {
    return "Please select a data file to analyze.";
  }
  
  // Ensure file data is always an array
  const safeData = safelyToArray(file.data || []);
  
  // More sophisticated simulated response for cloud models
  const rowCount = safeData.length;
  const colCount = file.columns.length;
  
  // Get a sample of data (first 3 rows) for analysis
  const sampleData = safeData.slice(0, 3);
  
  // Simulate different model capabilities
  const modelPrefix = model.id === "gpt-4" ? "Based on my advanced analysis" :
                      model.id === "mistral-large" ? "After reviewing your data" :
                      model.id === "claude-3" ? "Upon examining the dataset" :
                      "Looking at your data";
  
  const lowercaseQuery = userQuery.toLowerCase();
  
  // Enhanced responses based on model and query
  if (lowercaseQuery.includes("how many rows")) {
    return `${modelPrefix}, I can confirm that "${file.name}" contains ${rowCount} rows of data.`;
  } else if (lowercaseQuery.includes("how many columns") || lowercaseQuery.includes("what columns")) {
    return `${modelPrefix}, I've found that "${file.name}" contains ${colCount} columns: ${file.columns.join(", ")}.`;
  } else if (lowercaseQuery.includes("summary") || lowercaseQuery.includes("describe")) {
    // Create a more detailed summary for more advanced models
    let response = `${modelPrefix}, here's a comprehensive summary of "${file.name}":\n\n`;
    response += `**Dataset Overview:**\n- Rows: ${rowCount}\n- Columns: ${colCount}\n- Column names: ${file.columns.join(", ")}\n\n`;
    
    if (sampleData.length > 0) {
      response += "**Sample Data Preview:**\n";
      sampleData.forEach((row, index) => {
        response += `Row ${index + 1}: ${JSON.stringify(row)}\n`;
      });
    }
    
    return response;
  }
  
  // Default response
  return `${modelPrefix}, I've analyzed "${file.name}" with ${rowCount} rows and ${colCount} columns. The data contains information about ${file.columns.join(", ")}. What specific insights would you like me to extract from this dataset?`;
};
