
import { v4 as uuidv4 } from 'uuid';
import { ensureNumber, ensureString } from './type-correction';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  avatar: string;
  capabilities: string[];
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
    capabilities: ["Data analysis", "Context understanding", "Complex reasoning"]
  },
  {
    id: "gpt-3.5",
    name: "GPT-3.5",
    description: "Fast and efficient AI for general purpose tasks",
    avatar: "⚡",
    capabilities: ["Quick responses", "General knowledge", "Basic analysis"]
  }
];

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
