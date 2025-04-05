
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { sessionStore } from "@/utils/sessionStore";
import { FileData } from "@/utils/fileUtils";
import { Link } from "react-router-dom";
import { MessageCircle, Bot, Send, Settings, Database, ArrowLeft, Upload, Sparkles, RefreshCw, Download, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import AIFileUploader from "@/components/ai/AIFileUploader";
import UserMenu from "@/components/auth/UserMenu";

// Define AI model types
interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  requiresKey: boolean;
  isOpenSource?: boolean;
  avatar?: string;
}

// Define message types
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
}

const AIInteraction: React.FC = () => {
  // State for API keys
  const [openAIKey, setOpenAIKey] = useState<string>(localStorage.getItem("openai-api-key") || "");
  const [perplexityKey, setPerplexityKey] = useState<string>(localStorage.getItem("perplexity-api-key") || "");
  const [mistralKey, setMistralKey] = useState<string>(localStorage.getItem("mistral-api-key") || "");
  
  // State for chat and data
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>("local-model");
  const [availableFiles, setAvailableFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  // Models definition with improved open source options
  const models: AIModel[] = [
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "OpenAI",
      description: "Fast and efficient model for most tasks",
      requiresKey: true,
      avatar: "🟢"
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      description: "More powerful model with advanced reasoning",
      requiresKey: true,
      avatar: "🔵"
    },
    {
      id: "mistral-small",
      name: "Mistral Small",
      provider: "Mistral AI",
      description: "Efficient open-weight model with good performance",
      requiresKey: true,
      avatar: "🧠"
    },
    {
      id: "mistral-medium",
      name: "Mistral Medium",
      provider: "Mistral AI",
      description: "More powerful open-weight model for complex tasks",
      requiresKey: true,
      avatar: "🧩"
    },
    {
      id: "llama-3.1-sonar-small-128k-online",
      name: "Llama 3.1 Sonar Small",
      provider: "Perplexity",
      description: "Efficient model for general tasks",
      requiresKey: true,
      avatar: "🦙"
    },
    {
      id: "llama-3.1-sonar-large-128k-online",
      name: "Llama 3.1 Sonar Large",
      provider: "Perplexity",
      description: "More powerful model with enhanced reasoning",
      requiresKey: true,
      avatar: "🦙"
    },
    {
      id: "local-model",
      name: "Local Model",
      provider: "Open Source",
      description: "Fast local processing with no API key required",
      requiresKey: false,
      isOpenSource: true,
      avatar: "💻"
    }
  ];

  // Function to handle file upload directly from AI page
  const handleFilesProcessed = (newFiles: FileData[]) => {
    // Update available files list
    setAvailableFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newFiles];
      sessionStore.createStore('files', updatedFiles);
      return updatedFiles;
    });

    // Auto-select the first new file if we don't have a selection yet
    if (newFiles.length > 0 && !selectedFile) {
      setSelectedFile(newFiles[0].id);
    }

    toast.success(`${newFiles.length} file(s) added for AI analysis`);
  };
  
  // Load available files from session storage
  useEffect(() => {
    const files = sessionStore.getStore('files');
    if (files && files.length > 0) {
      setAvailableFiles(files);
      // Pre-select the first file if available
      if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0].id);
      }
    }
    
    // Load previous messages if any
    const savedMessages = sessionStore.getStore('ai-chat-messages');
    if (savedMessages && savedMessages.length > 0) {
      setMessages(savedMessages);
    } else {
      // Initialize with a welcome message
      const welcomeMessage: Message = {
        id: `system-${Date.now()}`,
        role: "assistant",
        content: "Hello! I'm your AI data assistant. Upload data files in the main app or using the upload tab, and I can help you analyze them. You can use the local model without any API key, or choose cloud models by providing your API keys in the settings tab.",
        timestamp: Date.now(),
        model: "system"
      };
      setMessages([welcomeMessage]);
    }
  }, []);
  
  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStore.createStore('ai-chat-messages', messages);
    }
  }, [messages]);
  
  // Save API keys when they change
  useEffect(() => {
    if (openAIKey) {
      localStorage.setItem("openai-api-key", openAIKey);
    }
    
    if (perplexityKey) {
      localStorage.setItem("perplexity-api-key", perplexityKey);
    }

    if (mistralKey) {
      localStorage.setItem("mistral-api-key", mistralKey);
    }
  }, [openAIKey, perplexityKey, mistralKey]);
  
  // Simulate loading progress for better UX
  useEffect(() => {
    let interval: number | undefined;
    
    if (isLoading) {
      setLoadingProgress(0);
      interval = window.setInterval(() => {
        setLoadingProgress(prev => {
          // Gradually increase until 90%, then wait for the actual response
          if (prev < 90) {
            const increment = Math.random() * 10;
            return Math.min(prev + increment, 90);
          }
          return prev;
        });
      }, 300);
    } else {
      setLoadingProgress(100);
      // Reset progress after a short delay
      const timeout = setTimeout(() => {
        setLoadingProgress(0);
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);
  
  // Get the current selected file data
  const getSelectedFileData = () => {
    if (!selectedFile) return null;
    return availableFiles.find(file => file.id === selectedFile);
  };
  
  // Clear chat history
  const handleClearChat = () => {
    const welcomeMessage: Message = {
      id: `system-${Date.now()}`,
      role: "assistant",
      content: "Chat history cleared. How can I assist you with your data analysis today?",
      timestamp: Date.now(),
      model: "system"
    };
    setMessages([welcomeMessage]);
    toast.success("Chat history cleared");
  };

  // Handle removing a file
  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = availableFiles.filter(file => file.id !== fileId);
    setAvailableFiles(updatedFiles);
    sessionStore.createStore('files', updatedFiles);
    
    // If the removed file was selected, select another file or null
    if (selectedFile === fileId) {
      setSelectedFile(updatedFiles.length > 0 ? updatedFiles[0].id : null);
    }
    
    toast.success("File removed from AI analysis");
  };

  // Get model display information
  const getModelInfo = (modelId: string) => {
    return models.find(model => model.id === modelId) || {
      name: "Unknown Model",
      provider: "Unknown",
      avatar: "❓"
    };
  };
  
  // Handle sending a message to the AI
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    
    // Get the selected file data
    const fileData = getSelectedFileData();
    const selectedModelInfo = models.find(model => model.id === selectedModel);
    
    try {
      // Check if we have the required API key for the selected model
      const apiKey = selectedModelInfo?.provider === "OpenAI" ? openAIKey : 
                    selectedModelInfo?.provider === "Perplexity" ? perplexityKey :
                    selectedModelInfo?.provider === "Mistral AI" ? mistralKey :
                    null;
      
      if (!apiKey && selectedModelInfo?.requiresKey) {
        throw new Error(`Please provide a valid ${selectedModelInfo.provider} API key in the settings tab.`);
      }
      
      let responseContent = "";
      
      // For the local model, don't require a key
      if (selectedModel === "local-model" || !selectedModelInfo?.requiresKey) {
        // Process locally
        responseContent = await processLocalAI(userMessage.content, fileData);
      } else {
        // In a real implementation, we would send a request to the AI API here
        // For this demo, we'll simulate a response
        responseContent = await simulateAIResponse(userMessage.content, fileData, selectedModelInfo, apiKey);
      }
      
      const aiResponse: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseContent,
        timestamp: Date.now(),
        model: selectedModelInfo?.id || "ai"
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      // Add an error message to the chat
      const errorMessage: Message = {
        id: `system-error-${Date.now()}`,
        role: "system",
        content: `Error: ${error.message || "Failed to get AI response. Please try again."}`,
        timestamp: Date.now(),
        model: "error"
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error(error.message || "Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced local AI data processing
  const processLocalAI = async (prompt: string, fileData: FileData | null): Promise<string> => {
    // Simulate network delay (shorter than cloud models)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    if (!fileData) {
      return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload a file in the main application or in the Upload tab.";
    }

    // Format checking to recognize more user intents
    const promptLower = prompt.toLowerCase();
    
    // Enhanced data analysis functions for better responsiveness
    if (promptLower.includes("statistics") || promptLower.includes("stats") || promptLower.includes("summary") || 
        promptLower.includes("describe") || promptLower.includes("overview")) {
      // Calculate some basic statistics about the data
      const numRows = fileData.data.length;
      const numCols = fileData.columns.length;
      
      // Calculate some sample statistics if there's numerical data
      let numericalStats = "";
      try {
        const numericColumns = fileData.columns.filter(col => 
          fileData.data.some(row => !isNaN(parseFloat(row[col])))
        );
        
        if (numericColumns.length > 0) {
          numericalStats = "\n\n**Numeric Column Statistics:**\n";
          
          for (const col of numericColumns.slice(0, 5)) { // Increased from 3 to 5 columns
            const values = fileData.data
              .map(row => parseFloat(row[col]))
              .filter(val => !isNaN(val));
              
            if (values.length > 0) {
              const sum = values.reduce((a, b) => a + b, 0);
              const avg = sum / values.length;
              const min = Math.min(...values);
              const max = Math.max(...values);
              const sortedVals = [...values].sort((a, b) => a - b);
              const median = sortedVals.length % 2 === 0 
                ? (sortedVals[sortedVals.length/2 - 1] + sortedVals[sortedVals.length/2]) / 2 
                : sortedVals[Math.floor(sortedVals.length/2)];
              
              numericalStats += `\n- **${col}**: Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}, Avg: ${avg.toFixed(2)}, Median: ${median.toFixed(2)}`;
            }
          }
        }
      } catch (e) {
        numericalStats = "\n\nCould not calculate numerical statistics for this dataset.";
      }

      // Identify categorical columns and report
      let categoricalStats = "";
      try {
        const categoricalColumns = fileData.columns.filter(col => {
          const uniqueValues = new Set(fileData.data.map(row => row[col]));
          // Consider columns with fewer unique values as categorical
          return uniqueValues.size < Math.min(20, fileData.data.length * 0.2);
        }).slice(0, 3); // Take up to 3 categorical columns
        
        if (categoricalColumns.length > 0) {
          categoricalStats = "\n\n**Categorical Column Distributions:**\n";
          
          for (const col of categoricalColumns) {
            const valueCounts: {[key: string]: number} = {};
            fileData.data.forEach(row => {
              const val = row[col] || "(empty)";
              valueCounts[val] = (valueCounts[val] || 0) + 1;
            });
            
            const topValues = Object.entries(valueCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3); // Show top 3 values
              
            categoricalStats += `\n- **${col}**: ${topValues.map(([val, count]) => 
              `"${val}": ${count} rows (${(count/fileData.data.length*100).toFixed(1)}%)`).join(', ')}`;
          }
        }
      } catch (e) {
        // Skip if there's an error analyzing categorical data
      }
      
      return `# Data Summary for "${fileData.name}"\n\n` +
        `- **Rows**: ${numRows}\n` +
        `- **Columns**: ${numCols}\n` +
        `- **Column names**: ${fileData.columns.join(", ")}\n` +
        `${numericalStats}` +
        `${categoricalStats}\n\n` +
        `**Sample Data (first 3 rows):**\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 3), null, 2)}\n\`\`\``;
    }
    
    // Enhanced counting and filtering
    if (promptLower.includes("count") || promptLower.includes("how many") || promptLower.includes("filter")) {
      const columnNames = fileData.columns;
      
      // Try to extract column name and value from the prompt
      let targetColumn = null;
      for (const col of columnNames) {
        if (promptLower.includes(col.toLowerCase())) {
          targetColumn = col;
          break;
        }
      }
      
      if (targetColumn) {
        // Look for comparison terms in the prompt
        const comparisonTerms = [
          { term: "greater than", op: ">" },
          { term: "more than", op: ">" },
          { term: "larger than", op: ">" },
          { term: "higher than", op: ">" },
          { term: "less than", op: "<" },
          { term: "smaller than", op: "<" },
          { term: "lower than", op: "<" },
          { term: "equal to", op: "=" },
          { term: "equals", op: "=" },
          { term: "is", op: "=" },
          { term: "contains", op: "contains" },
          { term: "starts with", op: "startsWith" },
          { term: "ends with", op: "endsWith" }
        ];
        
        let operation = null;
        let comparisonValue = null;
        
        for (const { term, op } of comparisonTerms) {
          if (promptLower.includes(term)) {
            operation = op;
            
            // Try to extract a value after the operator
            const termIndex = promptLower.indexOf(term);
            const afterTerm = prompt.slice(termIndex + term.length).trim();
            
            // Look for a number or a quoted string
            const numberMatch = afterTerm.match(/^[\s]*([0-9.]+)/);
            const stringMatch = afterTerm.match(/^[\s]*['"]([^'"]+)['"]/);
            const wordMatch = afterTerm.match(/^[\s]*([^\s.,?!]+)/);
            
            if (numberMatch) {
              comparisonValue = parseFloat(numberMatch[1]);
            } else if (stringMatch) {
              comparisonValue = stringMatch[1];
            } else if (wordMatch) {
              comparisonValue = wordMatch[1];
            }
            
            break;
          }
        }
        
        if (operation && comparisonValue !== null) {
          let filteredRows = [];
          
          switch(operation) {
            case ">":
              filteredRows = fileData.data.filter(row => {
                const val = parseFloat(row[targetColumn!]);
                return !isNaN(val) && val > (comparisonValue as number);
              });
              break;
            case "<":
              filteredRows = fileData.data.filter(row => {
                const val = parseFloat(row[targetColumn!]);
                return !isNaN(val) && val < (comparisonValue as number);
              });
              break;
            case "=":
              filteredRows = fileData.data.filter(row => 
                String(row[targetColumn!]).toLowerCase() === String(comparisonValue).toLowerCase()
              );
              break;
            case "contains":
              filteredRows = fileData.data.filter(row => 
                String(row[targetColumn!]).toLowerCase().includes(String(comparisonValue).toLowerCase())
              );
              break;
            case "startsWith":
              filteredRows = fileData.data.filter(row => 
                String(row[targetColumn!]).toLowerCase().startsWith(String(comparisonValue).toLowerCase())
              );
              break;
            case "endsWith":
              filteredRows = fileData.data.filter(row => 
                String(row[targetColumn!]).toLowerCase().endsWith(String(comparisonValue).toLowerCase())
              );
              break;
          }
          
          if (filteredRows.length > 0) {
            const operationText = operation === ">" ? "greater than" : 
                                 operation === "<" ? "less than" :
                                 operation === "=" ? "equal to" :
                                 operation;
            
            let response = `Found ${filteredRows.length} rows where ${targetColumn} is ${operationText} ${comparisonValue}.\n\n`;
            
            if (filteredRows.length <= 3) {
              response += `Here are all the matching rows:\n\`\`\`\n${JSON.stringify(filteredRows, null, 2)}\n\`\`\``;
            } else {
              response += `Here are the first 3 matching rows:\n\`\`\`\n${JSON.stringify(filteredRows.slice(0, 3), null, 2)}\n\`\`\``;
            }
            
            return response;
          } else {
            return `No rows found where ${targetColumn} is ${operation} ${comparisonValue}.`;
          }
        }
        
        // If no specific operation was found but we have a column, show distribution
        const valueCounts: {[key: string]: number} = {};
        fileData.data.forEach(row => {
          const val = row[targetColumn!] || "(empty)";
          valueCounts[val] = (valueCounts[val] || 0) + 1;
        });
        
        const topValues = Object.entries(valueCounts)
          .sort((a, b) => b[1] - a[1]);
          
        let response = `Here's the distribution of values in column "${targetColumn}" from dataset "${fileData.name}":\n\n`;
        
        // Only show all values if there are 10 or fewer unique values
        const valuesToShow = topValues.length <= 10 ? topValues : topValues.slice(0, 10);
        response += valuesToShow.map(([val, count]) => `- "${val}": ${count} rows (${(count/fileData.data.length*100).toFixed(1)}%)`).join('\n');
        
        if (topValues.length > 10) {
          response += `\n\n...and ${topValues.length - 10} more unique values.`;
        }
        
        return response;
      }
      
      return `The dataset "${fileData.name}" has ${fileData.data.length} rows and ${columnNames.length} columns. To filter or count specific values, please specify a column name in your question. Available columns are: ${columnNames.join(", ")}`;
    }

    // Improved chart suggestion
    if (promptLower.includes("chart") || promptLower.includes("plot") || promptLower.includes("graph") || 
        promptLower.includes("visualization") || promptLower.includes("visualize")) {
      // Identify potential columns for visualization
      const numericColumns = fileData.columns.filter(col => 
        fileData.data.some(row => !isNaN(parseFloat(row[col])))
      );
      
      const categoricalColumns = fileData.columns.filter(col => {
        const uniqueValues = new Set(fileData.data.map(row => row[col]));
        return uniqueValues.size < Math.min(fileData.data.length / 5, 20);
      });
      
      // Check if the prompt mentions specific columns
      let requestedColumns = [];
      for (const col of fileData.columns) {
        if (promptLower.includes(col.toLowerCase())) {
          requestedColumns.push(col);
        }
      }
      
      // If specific columns are requested, prioritize those
      if (requestedColumns.length > 0) {
        const requestedNumeric = requestedColumns.filter(col => numericColumns.includes(col));
        const requestedCategorical = requestedColumns.filter(col => categoricalColumns.includes(col));
        
        if (requestedNumeric.length > 0 && requestedCategorical.length > 0) {
          return `For visualizing the relationship between "${requestedCategorical[0]}" and "${requestedNumeric[0]}" in dataset "${fileData.name}", I recommend:\n\n` +
            `1. **Bar Chart**: Use "${requestedCategorical[0]}" on the x-axis and "${requestedNumeric[0]}" on the y-axis to compare values across categories.\n` +
            `2. **Box Plot**: This would show the distribution of "${requestedNumeric[0]}" for each value of "${requestedCategorical[0]}".\n\n` +
            `Here's a sample of the data to help you understand the relationship:\n\`\`\`\n${
              JSON.stringify(fileData.data.slice(0, 3).map(row => ({
                [requestedCategorical[0]]: row[requestedCategorical[0]],
                [requestedNumeric[0]]: row[requestedNumeric[0]]
              })), null, 2)
            }\n\`\`\``;
        } else if (requestedNumeric.length > 1) {
          return `For visualizing the relationship between "${requestedNumeric[0]}" and "${requestedNumeric[1]}" in dataset "${fileData.name}", I recommend:\n\n` +
            `1. **Scatter Plot**: This will show if there's any correlation between the two numerical variables.\n` +
            `2. **Line Chart**: If the data has a time component or natural ordering.\n\n` +
            `Here's a sample of the data to help you understand the relationship:\n\`\`\`\n${
              JSON.stringify(fileData.data.slice(0, 3).map(row => ({
                [requestedNumeric[0]]: row[requestedNumeric[0]],
                [requestedNumeric[1]]: row[requestedNumeric[1]]
              })), null, 2)
            }\n\`\`\``;
        } else if (requestedCategorical.length > 0) {
          return `For visualizing the distribution of "${requestedCategorical[0]}" in dataset "${fileData.name}", I recommend:\n\n` +
            `1. **Pie Chart**: Shows the proportion of each category.\n` +
            `2. **Bar Chart**: Shows the count or frequency of each category.\n\n` +
            `Here's the distribution of values:\n\`\`\`\n${
              JSON.stringify(
                Object.entries(
                  fileData.data.reduce((counts: {[key: string]: number}, row) => {
                    const val = row[requestedCategorical[0]] || "(empty)";
                    counts[val] = (counts[val] || 0) + 1;
                    return counts;
                  }, {})
                ).sort((a, b) => b[1] - a[1]).slice(0, 10)
              )
            }\n\`\`\``;
        }
      }
      
      // Generic visualization recommendations
      if (numericColumns.length > 0 && categoricalColumns.length > 0) {
        return `For data visualization of "${fileData.name}", I recommend:\n\n` +
          `1. **Bar chart**: Use "${categoricalColumns[0]}" on x-axis and "${numericColumns[0]}" on y-axis\n` + 
          `2. **Scatter plot**: Compare "${numericColumns[0]}" vs "${numericColumns.length > 1 ? numericColumns[1] : numericColumns[0]}"\n` +
          `3. **Pie chart**: Show the distribution of "${categoricalColumns[0]}"\n\n` +
          `Available columns for visualization:\n` +
          `- Numerical: ${numericColumns.join(", ")}\n` +
          `- Categorical: ${categoricalColumns.join(", ")}\n\n` +
          `For more specific visualizations, please ask about particular columns you're interested in.`;
      } else if (numericColumns.length > 0) {
        return `For dataset "${fileData.name}", I recommend visualizing the numerical columns:\n\n` +
          `1. **Histogram** for "${numericColumns[0]}": Shows the distribution of values\n` +
          `2. **Line chart**: Good if your data has a time or sequential component\n` +
          `3. **Box plot**: Shows the median, quartiles, and outliers\n\n` +
          `Available numerical columns: ${numericColumns.join(", ")}`;
      } else if (categoricalColumns.length > 0) {
        return `For dataset "${fileData.name}", I recommend visualizing the categorical columns:\n\n` +
          `1. **Bar chart** for "${categoricalColumns[0]}": Shows the count of each category\n` +
          `2. **Pie chart**: Shows the proportion of each category\n` +
          `3. **Treemap**: Useful for hierarchical categorical data\n\n` +
          `Available categorical columns: ${categoricalColumns.join(", ")}`;
      }
      
      return `For data visualization of "${fileData.name}", I would need more information about what aspects of the data you want to visualize. The dataset contains ${fileData.data.length} rows and columns: ${fileData.columns.join(", ")}`;
    }
    
    // Improved correlation and relationship detection
    if (promptLower.includes("correlate") || promptLower.includes("relationship") || promptLower.includes("related") ||
        promptLower.includes("connection") || promptLower.includes("compare")) {
      
      // Try to identify which columns to compare
      let columnsToCompare = [];
      for (const col of fileData.columns) {
        if (promptLower.includes(col.toLowerCase())) {
          columnsToCompare.push(col);
        }
      }
      
      if (columnsToCompare.length >= 2) {
        // Two specific columns mentioned
        const col1 = columnsToCompare[0];
        const col2 = columnsToCompare[1];
        
        // Check if both are numeric
        const isCol1Numeric = fileData.data.some(row => !isNaN(parseFloat(row[col1])));
        const isCol2Numeric = fileData.data.some(row => !isNaN(parseFloat(row[col2])));
        
        if (isCol1Numeric && isCol2Numeric) {
          // Calculate correlation for numeric columns
          try {
            const validPairs = fileData.data
              .map(row => [parseFloat(row[col1]), parseFloat(row[col2])])
              .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
            
            if (validPairs.length < 5) {
              return `Not enough valid numeric pairs to calculate correlation between "${col1}" and "${col2}".`;
            }
            
            // Calculate means
            const mean1 = validPairs.reduce((sum, pair) => sum + pair[0], 0) / validPairs.length;
            const mean2 = validPairs.reduce((sum, pair) => sum + pair[1], 0) / validPairs.length;
            
            // Calculate correlation coefficient
            let numerator = 0;
            let denom1 = 0;
            let denom2 = 0;
            
            for (const [val1, val2] of validPairs) {
              const dev1 = val1 - mean1;
              const dev2 = val2 - mean2;
              numerator += dev1 * dev2;
              denom1 += dev1 * dev1;
              denom2 += dev2 * dev2;
            }
            
            const correlation = numerator / (Math.sqrt(denom1) * Math.sqrt(denom2));
            let relationshipStrength;
            
            if (Math.abs(correlation) > 0.7) {
              relationshipStrength = "strong";
            } else if (Math.abs(correlation) > 0.3) {
              relationshipStrength = "moderate";
            } else {
              relationshipStrength = "weak";
            }
            
            let relationshipDirection = correlation > 0 ? "positive" : "negative";
            
            return `Analysis of relationship between "${col1}" and "${col2}" in dataset "${fileData.name}":\n\n` +
              `- Correlation coefficient: ${correlation.toFixed(4)}\n` +
              `- Interpretation: There is a ${relationshipStrength} ${relationshipDirection} correlation between the two variables.\n` +
              `- This means that ${relationshipDirection === "positive" ? "as one value increases, the other tends to increase as well" : "as one value increases, the other tends to decrease"}.\n\n` +
              `Sample data points:\n\`\`\`\n${
                JSON.stringify(
                  fileData.data.slice(0, 5).map(row => ({
                    [col1]: row[col1],
                    [col2]: row[col2]
                  })), null, 2
                )
              }\n\`\`\``;
          } catch (e) {
            return `Unable to calculate correlation between "${col1}" and "${col2}" due to an error. Please check that both columns contain valid numerical data.`;
          }
        } else {
          // For categorical relationships, create a contingency table
          try {
            const contingencyTable: {[key: string]: {[key: string]: number}} = {};
            
            // Count occurrences of each combination
            for (const row of fileData.data) {
              const val1 = String(row[col1] || "(empty)");
              const val2 = String(row[col2] || "(empty)");
              
              if (!contingencyTable[val1]) {
                contingencyTable[val1] = {};
              }
              
              contingencyTable[val1][val2] = (contingencyTable[val1][val2] || 0) + 1;
            }
            
            // Convert to a more readable format
            const uniqueVal1 = Object.keys(contingencyTable);
            const uniqueVal2 = Array.from(new Set(fileData.data.map(row => String(row[col2] || "(empty)"))));
            
            // Limit display if there are too many values
            const val1ToShow = uniqueVal1.length <= 5 ? uniqueVal1 : uniqueVal1.slice(0, 5);
            const val2ToShow = uniqueVal2.length <= 5 ? uniqueVal2 : uniqueVal2.slice(0, 5);
            
            let tableString = `Relationship between "${col1}" and "${col2}" (showing counts for each combination):\n\n`;
            
            // Header row
            tableString += `| ${col1} \\ ${col2} | ${val2ToShow.join(" | ")} |\n`;
            tableString += `| ${"-".repeat(col1.length)} | ${val2ToShow.map(v => "-".repeat(v.length)).join(" | ")} |\n`;
            
            // Data rows
            for (const val1 of val1ToShow) {
              tableString += `| ${val1} | `;
              
              for (const val2 of val2ToShow) {
                const count = contingencyTable[val1]?.[val2] || 0;
                tableString += `${count} | `;
              }
              
              tableString += "\n";
            }
            
            if (uniqueVal1.length > 5 || uniqueVal2.length > 5) {
              tableString += "\n(Table truncated due to large number of unique values)";
            }
            
            return tableString;
          } catch (e) {
            return `Unable to analyze the relationship between "${col1}" and "${col2}" due to an error. Please try with different columns.`;
          }
        }
      } else if (columnsToCompare.length === 1) {
        // Only one column mentioned - describe its distribution
        const col = columnsToCompare[0];
        const isNumeric = fileData.data.some(row => !isNaN(parseFloat(row[col])));
        
        if (isNumeric) {
          // Numeric column analysis
          try {
            const values = fileData.data
              .map(row => parseFloat(row[col]))
              .filter(val => !isNaN(val));
              
            if (values.length === 0) return `No valid numeric values found in column "${col}".`;
            
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const sortedVals = [...values].sort((a, b) => a - b);
            const median = sortedVals.length % 2 === 0 
              ? (sortedVals[sortedVals.length/2 - 1] + sortedVals[sortedVals.length/2]) / 2 
              : sortedVals[Math.floor(sortedVals.length/2)];
            
            // Calculate quartiles and range
            const q1 = sortedVals[Math.floor(sortedVals.length * 0.25)];
            const q3 = sortedVals[Math.floor(sortedVals.length * 0.75)];
            const iqr = q3 - q1;
            
            return `Statistical analysis of "${col}" in dataset "${fileData.name}":\n\n` +
              `- Count: ${values.length} non-null values\n` +
              `- Min: ${min.toFixed(2)}\n` +
              `- Max: ${max.toFixed(2)}\n` +
              `- Range: ${(max - min).toFixed(2)}\n` +
              `- Mean: ${avg.toFixed(2)}\n` +
              `- Median: ${median.toFixed(2)}\n` +
              `- 1st Quartile (Q1): ${q1.toFixed(2)}\n` +
              `- 3rd Quartile (Q3): ${q3.toFixed(2)}\n` +
              `- Interquartile Range (IQR): ${iqr.toFixed(2)}\n\n` +
              `This column appears to be numeric. To compare it with another column, please specify both columns in your question.`;
          } catch (e) {
            return `Unable to analyze column "${col}" due to an error. Please try with a different column.`;
          }
        } else {
          // Categorical column analysis
          try {
            const valueCounts: {[key: string]: number} = {};
            fileData.data.forEach(row => {
              const val = row[col] || "(empty)";
              valueCounts[val] = (valueCounts[val] || 0) + 1;
            });
            
            const totalCount = fileData.data.length;
            const uniqueCount = Object.keys(valueCounts).length;
            
            // Sort by frequency
            const sortedCounts = Object.entries(valueCounts)
              .sort((a, b) => b[1] - a[1]);
            
            let topValuesString = "";
            const topToShow = Math.min(10, sortedCounts.length);
            
            for (let i = 0; i < topToShow; i++) {
              const [val, count] = sortedCounts[i];
              const percentage = (count / totalCount * 100).toFixed(1);
              topValuesString += `- "${val}": ${count} occurrences (${percentage}%)\n`;
            }
            
            if (sortedCounts.length > topToShow) {
              topValuesString += `- ... and ${sortedCounts.length - topToShow} more unique values\n`;
            }
            
            return `Analysis of categorical column "${col}" in dataset "${fileData.name}":\n\n` +
              `- Total values: ${totalCount}\n` +
              `- Unique values: ${uniqueCount}\n` +
              `- Most common values:\n${topValuesString}\n` +
              `This column appears to be categorical. To compare it with another column, please specify both columns in your question.`;
          } catch (e) {
            return `Unable to analyze column "${col}" due to an error. Please try with a different column.`;
          }
        }
      }
      
      // If no specific columns mentioned, suggest commonly correlated columns
      const numericColumns = fileData.columns.filter(col => 
        fileData.data.some(row => !isNaN(parseFloat(row[col])))
      );
      
      if (numericColumns.length >= 2) {
        return `To analyze relationships in dataset "${fileData.name}", please specify which columns you'd like to compare. Here are some potential numeric columns you could compare:\n\n` +
          `- ${numericColumns.join("\n- ")}\n\n` +
          `Example query: "What's the relationship between ${numericColumns[0]} and ${numericColumns[1]}?"`;
      } else {
        return `To analyze relationships in dataset "${fileData.name}", please specify which columns you'd like to compare. The dataset has these columns:\n\n` +
          `- ${fileData.columns.join("\n- ")}\n\n` +
          `Example query: "What's the relationship between ${fileData.columns[0]} and ${fileData.columns.length > 1 ? fileData.columns[1] : 'another column'}?"`;
      }
    }
    
    // Improved find/search functionality
    if (promptLower.includes("find") || promptLower.includes("search") || promptLower.includes("lookup") ||
        promptLower.includes("where") || promptLower.includes("which") || promptLower.includes("who")) {
      
      // Try to extract search terms
      const searchTerms = [
        ...(prompt.match(/["']([^"']+)["']/g) || []).map(term => term.replace(/["']/g, '')),
        ...(prompt.match(/\b[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+\.[A-Za-z]{2,}\b/g) || []), // Emails
        ...(prompt.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []), // Dates in YYYY-MM-DD format
        ...(prompt.match(/\b\d+(?:\.\d+)?\b/g) || []) // Numbers with optional decimal point
      ];
      
      if (searchTerms.length > 0) {
        // Search across all columns for these terms
        const matches = fileData.data.filter(row => 
          Object.values(row).some(val => 
            searchTerms.some(term => 
              String(val).toLowerCase().includes(term.toLowerCase())
            )
          )
        );
        
        if (matches.length === 0) {
          return `No rows found matching any of these search terms: ${searchTerms.join(", ")}`;
        }
        
        const matchCount = matches.length;
        const showCount = Math.min(3, matchCount);
        
        return `Found ${matchCount} rows matching your search criteria.\n\n` +
          `Here ${showCount === 1 ? "is" : "are"} the first ${showCount}:\n\`\`\`\n${JSON.stringify(matches.slice(0, showCount), null, 2)}\n\`\`\`\n\n` +
          (matchCount > showCount ? `...and ${matchCount - showCount} more matching rows.` : "");
      }
      
      // Try to extract column name and search condition from the prompt
      let targetColumn = null;
      for (const col of fileData.columns) {
        if (promptLower.includes(col.toLowerCase())) {
          targetColumn = col;
          break;
        }
      }
      
      if (targetColumn) {
        // Look for potential comparison operators and values
        const operators = [
          "greater than", "more than", "higher than", "above", "over",
          "less than", "lower than", "below", "under",
          "equal to", "equals", "is",
          "contains", "has", "with",
          "starts with", "begins with",
          "ends with"
        ];
        let operation = null;
        let comparisonValue = null;
        
        for (const op of operators) {
          if (promptLower.includes(op)) {
            operation = op;
            
            // Try to extract a value after the operator
            const opIndex = promptLower.indexOf(op);
            const afterOp = prompt.slice(opIndex + op.length).trim();
            
            // Look for numbers, quoted strings, or just the next word
            const numberMatch = afterOp.match(/^[\s]*([0-9.]+)/);
            const stringMatch = afterOp.match(/^[\s]*["']([^"']+)["']/);
            const wordMatch = afterOp.match(/^[\s]*([^\s.,?!]+)/);
            
            if (numberMatch) {
              comparisonValue = parseFloat(numberMatch[1]);
            } else if (stringMatch) {
              comparisonValue = stringMatch[1];
            } else if (wordMatch) {
              comparisonValue = wordMatch[1];
            }
            
            break;
          }
        }
        
        if (operation && comparisonValue !== null) {
          let result;
          let filteredRows;
          
          if (operation.includes("greater") || operation.includes("more") || 
              operation.includes("higher") || operation.includes("above") || operation.includes("over")) {
            // Greater than comparison
            filteredRows = fileData.data.filter(row => {
              const val = parseFloat(row[targetColumn!]);
              return !isNaN(val) && val > (comparisonValue as number);
            });
            
            result = `Found ${filteredRows.length} rows where ${targetColumn} is greater than ${comparisonValue}.`;
          } else if (operation.includes("less") || operation.includes("lower") || 
                    operation.includes("below") || operation.includes("under")) {
            // Less than comparison
            filteredRows = fileData.data.filter(row => {
              const val = parseFloat(row[targetColumn!]);
              return !isNaN(val) && val < (comparisonValue as number);
            });
            
            result = `Found ${filteredRows.length} rows where ${targetColumn} is less than ${comparisonValue}.`;
          } else if (operation.includes("equal") || operation.includes("is") || operation.includes("equals")) {
            // Equality comparison
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase() === String(comparisonValue).toLowerCase()
            );
            
            result = `Found ${filteredRows.length} rows where ${targetColumn} equals "${comparisonValue}".`;
          } else if (operation.includes("contains") || operation.includes("has") || operation.includes("with")) {
            // Contains comparison
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase().includes(String(comparisonValue).toLowerCase())
            );
            
            result = `Found ${filteredRows.length} rows where ${targetColumn} contains "${comparisonValue}".`;
          } else if (operation.includes("starts") || operation.includes("begins")) {
            // Starts with comparison
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase().startsWith(String(comparisonValue).toLowerCase())
            );
            
            result = `Found ${filteredRows.length} rows where ${targetColumn} starts with "${comparisonValue}".`;
          } else if (operation.includes("ends")) {
            // Ends with comparison
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase().endsWith(String(comparisonValue).toLowerCase())
            );
            
            result = `Found ${filteredRows.length} rows where ${targetColumn} ends with "${comparisonValue}".`;
          }
          
          if (result && filteredRows) {
            if (filteredRows.length === 0) {
              return result;
            }
            
            // Include some sample rows
            const showCount = Math.min(3, filteredRows.length);
            result += `\n\nHere ${showCount === 1 ? "is" : "are"} the first ${showCount}:\n\`\`\`\n${JSON.stringify(filteredRows.slice(0, showCount), null, 2)}\n\`\`\``;
            
            if (filteredRows.length > showCount) {
              result += `\n\n...and ${filteredRows.length - showCount} more matching rows.`;
            }
            
            return result;
          }
        }
      }
    }
    
    // Return a enhanced generic response with better column analysis and more helpful information
    return `I've analyzed the data in "${fileData.name}" which contains ${fileData.data.length} rows and ${fileData.columns.length} columns.\n\n` +
      `Here are some questions you can ask:\n` +
      `- "Show me statistics for this dataset"\n` +
      `- "Count how many rows have [specific value] in [column name]"\n` +
      `- "Find the maximum/minimum value in [column name]"\n` +
      `- "Which rows have [column name] greater than [value]?"\n` +
      `- "Show the relationship between [column A] and [column B]"\n` +
      `- "Create a chart recommendation for [column name]"\n\n` +
      `Available columns: ${fileData.columns.join(", ")}\n\n` +
      `Sample data (first 2 rows):\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 2), null, 2)}\n\`\`\``;
  };
  
  // Simulated AI response function (in a real app, this would call an actual AI API)
  const simulateAIResponse = async (prompt: string, fileData: FileData | null, model: AIModel | undefined, apiKey: string): Promise<string> => {
    // Simulate different network delays based on the model provider
    const delayMs = model?.provider === "OpenAI" ? 2000 : 
                   model?.provider === "Perplexity" ? 1800 : 
                   model?.provider === "Mistral AI" ? 1500 : 1000;
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    if (!model) {
      return "Please select a valid AI model to continue.";
    }
    
    // If no API key and model requires one, return error message
    if (!apiKey && model.requiresKey) {
      throw new Error(`Please provide a valid ${model.provider} API key in the settings tab.`);
    }
    
    if (!fileData) {
      return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload a file in the main application or in the Upload tab.";
    }
    
    // Enhance responses based on model provider
    const modelInfo = `${model.name} (${model.provider})`;
    
    // Check if the prompt is asking about data stats
    if (prompt.toLowerCase().includes("statistics") || prompt.toLowerCase().includes("stats") || prompt.toLowerCase().includes("summary")) {
      return `# Data Summary for "${fileData.name}" (using ${modelInfo})\n\n` +
        `- **Rows**: ${fileData.data.length}\n` +
        `- **Columns**: ${fileData.columns.length}\n` +
        `- **Column names**: ${fileData.columns.join(", ")}\n\n` +
        `**Sample Data (first 3 rows):**\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 3), null, 2)}\n\`\`\`\n\n` +
        `I can perform more detailed analysis if you ask specific questions about the data.`;
    }
    
    // Add some model-specific responses
    if (model.provider === "OpenAI") {
      return `I've analyzed the data in "${fileData.name}" using ${modelInfo}.\n\n` +
        `The dataset contains ${fileData.data.length} rows and ${fileData.columns.length} columns: ${fileData.columns.join(", ")}\n\n` +
        `Some initial observations:\n` +
        `- The dataset appears to be about ${fileData.name.split('.')[0].toLowerCase().includes("sales") ? "sales data" : fileData.name.split('.')[0].toLowerCase().includes("customer") ? "customer information" : "tabular data"}\n` +
        `- ${fileData.columns.some(col => col.toLowerCase().includes("date")) ? "There's a time component to this data" : "This appears to be non-temporal data"}\n\n` +
        `What specific insights would you like me to provide about this dataset?`;
    } else if (model.provider === "Perplexity") {
      return `I've analyzed the dataset "${fileData.name}" using ${modelInfo}.\n\n` +
        `This dataset has ${fileData.data.length} rows and ${fileData.columns.length} columns.\n\n` +
        `The columns are: ${fileData.columns.join(", ")}\n\n` +
        `Based on initial assessment, you might want to explore:\n` +
        `- Summary statistics for numerical columns\n` +
        `- Distribution of values in categorical columns\n` +
        `- Relationships between different variables\n\n` +
        `What specific aspect of this data would you like me to analyze?`;
    } else if (model.provider === "Mistral AI") {
      return `Analysis of "${fileData.name}" with ${modelInfo}:\n\n` +
        `Dataset dimensions: ${fileData.data.length} rows × ${fileData.columns.length} columns\n\n` +
        `Available columns for analysis:\n- ${fileData.columns.join("\n- ")}\n\n` +
        `Quick sample:\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 2), null, 2)}\n\`\`\`\n\n` +
        `How would you like to proceed with analyzing this dataset? I can help with statistical summaries, finding patterns, or answering specific questions about the data.`;
    }
    
    // Fall back to a generic response
    return `I've analyzed the data in "${fileData.name}" using ${modelInfo}. The dataset contains ${fileData.data.length} rows and ${fileData.columns.length} columns.\n\n` +
      `Columns: ${fileData.columns.join(", ")}\n\n` +
      `What specific insights or analysis would you like me to provide about this dataset?`;
  };
  
  // Handle key press in the message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp for messages
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto py-4 px-4 sm:px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>Back</span>
              </Link>
              <Separator orientation="vertical" className="h-6 mx-2" />
              <h1 className="text-2xl font-medium tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Data AI Assistant
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-6 px-4 sm:px-6">
        <Tabs defaultValue="chat" className="h-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="bg-card">
              <TabsTrigger value="chat" className="flex gap-1.5 items-center">
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex gap-1.5 items-center">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex gap-1.5 items-center">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="h-[calc(100vh-220px)] flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
              <Card className="md:col-span-3 flex flex-col h-full border border-border/50 shadow-sm">
                <CardHeader className="bg-card/50 border-b border-border/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Chat with AI
                      </CardTitle>
                      <CardDescription>
                        Ask questions about your data
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedFile || ""}
                        onValueChange={setSelectedFile}
                      >
                        <SelectTrigger className="w-[220px] bg-background border-border/50">
                          <SelectValue placeholder="Select a file to analyze" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFiles.length > 0 ? (
                            availableFiles.map(file => (
                              <SelectItem key={file.id} value={file.id} className="flex justify-between items-center">
                                <span className="truncate max-w-[190px]">{file.name}</span>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No files available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {loadingProgress > 0 && (
                    <div className="px-4 py-1 bg-background">
                      <Progress value={loadingProgress} className="h-1" />
                    </div>
                  )}
                  <ScrollArea className="h-[calc(100vh-380px)] px-6 py-4">
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex flex-col",
                            message.role === "user" ? "items-end" : "items-start",
                            message.role === "system" && "items-center"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-xs text-muted-foreground",
                              message.role === "user" && "order-2",
                            )}>
                              {message.role === "user" ? "You" : 
                               message.role === "system" ? "System" :
                               message.model ? getModelInfo(message.model).name : "Assistant"}
                            </span>
                            
                            {message.role === "assistant" && message.model && message.model !== "system" && message.model !== "error" && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 rounded-full">
                                {getModelInfo(message.model).avatar} {getModelInfo(message.model).provider}
                              </Badge>
                            )}
                            
                            <span className="text-xs text-muted-foreground/70">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          
                          <div
                            className={cn(
                              "rounded-lg p-4 max-w-[90%]",
                              message.role === "user" 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                                : message.role === "assistant" 
                                  ? "bg-card border border-border/50 shadow-sm" 
                                  : message.model === "error"
                                    ? "bg-destructive/10 text-destructive text-sm border border-destructive/20"
                                    : "bg-muted text-muted-foreground text-sm"
                            )}
                          >
                            <div className="whitespace-pre-wrap">
                              {message.content.split('\n').map((line, i) => {
                                if (line.startsWith('# ')) {
                                  return <h3 key={i} className="text-lg font-bold mb-2">{line.substring(2)}</h3>;
                                } else if (line.startsWith('## ')) {
                                  return <h4 key={i} className="text-md font-bold mb-1">{line.substring(3)}</h4>;
                                } else if (line.startsWith('- **')) {
                                  const parts = line.split('**');
                                  return (
                                    <div key={i} className="flex my-1">
                                      <span className="font-bold">{parts[1]}:</span>
                                      <span className="ml-1">{parts.slice(2).join('**')}</span>
                                    </div>
                                  );
                                } else if (line.startsWith('```')) {
                                  return null; // Skip code block markers
                                } else if (line.startsWith('**Sample Data')) {
                                  return <div key={i} className="font-semibold mt-2">{line.replace(/\*\*/g, '')}</div>;
                                } else if (line.startsWith('|')) {
                                  // Handle table rows
                                  return (
                                    <div key={i} className="my-1 font-mono text-xs overflow-x-auto">
                                      {line}
                                    </div>
                                  );
                                } else {
                                  return <div key={i}>{line}</div>;
                                }
                              })}
                              
                              {/* Render code blocks separately */}
                              {message.content.includes('```') && (
                                <div className="bg-gray-800 text-gray-200 p-2 rounded mt-2 overflow-x-auto">
                                  {message.content.split('```').filter((_, i) => i % 2 === 1).map((block, i) => (
                                    <pre key={i} className="text-xs">{block}</pre>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="rounded-lg p-4 max-w-[80%] bg-card border border-border/50 shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="animate-pulse flex gap-1">
                                <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"></span>
                              </div>
                              <span className="text-muted-foreground">Analyzing data...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="border-t border-border/30 bg-card/50 p-4">
                  <div className="flex flex-col w-full gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask a question about your data..."
                      className="min-h-[60px] resize-none border-border/50"
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {availableFiles.length > 0 && !selectedFile && (
                          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                            Select a file to analyze
                          </Badge>
                        )}
                        {selectedFile && availableFiles.find(f => f.id === selectedFile) && (
                          <Badge variant="outline" className="flex items-center gap-1.5">
                            <Database className="h-3 w-3" />
                            <span className="truncate max-w-[20ch]">
                              {availableFiles.find(f => f.id === selectedFile)?.name}
                            </span>
                            <button 
                              onClick={() => setSelectedFile(null)}
                              className="ml-1 text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={handleClearChat}
                          disabled={isLoading || messages.length <= 1}
                          className="border-border/50"
                          title="Clear chat"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={isLoading || !inputMessage.trim() || (!selectedFile && availableFiles.length > 0)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardFooter>
              </Card>

              <div className="space-y-4">
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="bg-card/50 border-b border-border/30">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <span>AI Models</span>
                    </CardTitle>
                    <CardDescription>Choose your AI model</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {/* Open Source Model - Put first for emphasis */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-semibold">Open Source Models</Label>
                        <div className="space-y-2">
                          {models
                            .filter(model => model.isOpenSource)
                            .map(model => (
                              <div
                                key={model.id}
                                className={cn(
                                  "border rounded-md p-3 cursor-pointer transition-all",
                                  selectedModel === model.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-accent/50 border-border/50"
                                )}
                                onClick={() => setSelectedModel(model.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-medium flex items-center gap-1.5">
                                    <span>{model.avatar}</span>
                                    <span>{model.name}</span>
                                  </div>
                                  {selectedModel === model.id && (
                                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600">Selected</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {model.description}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                      {/* Mistral AI Models */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-semibold">Mistral AI Models</Label>
                        <div className="space-y-2">
                          {models
                            .filter(model => model.provider === "Mistral AI")
                            .map(model => (
                              <div
                                key={model.id}
                                className={cn(
                                  "border rounded-md p-3 cursor-pointer transition-all",
                                  selectedModel === model.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-accent/50 border-border/50"
                                )}
                                onClick={() => setSelectedModel(model.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-medium flex items-center gap-1.5">
                                    <span>{model.avatar}</span>
                                    <span>{model.name}</span>
                                  </div>
                                  {selectedModel === model.id && (
                                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600">Selected</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {model.description}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                      {/* OpenAI Models */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-semibold">OpenAI Models</Label>
                        <div className="space-y-2">
                          {models
                            .filter(model => model.provider === "OpenAI")
                            .map(model => (
                              <div
                                key={model.id}
                                className={cn(
                                  "border rounded-md p-3 cursor-pointer transition-all",
                                  selectedModel === model.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-accent/50 border-border/50"
                                )}
                                onClick={() => setSelectedModel(model.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-medium flex items-center gap-1.5">
                                    <span>{model.avatar}</span>
                                    <span>{model.name}</span>
                                  </div>
                                  {selectedModel === model.id && (
                                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600">Selected</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {model.description}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                      {/* Perplexity Models */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-semibold">Perplexity Models</Label>
                        <div className="space-y-2">
                          {models
                            .filter(model => model.provider === "Perplexity")
                            .map(model => (
                              <div
                                key={model.id}
                                className={cn(
                                  "border rounded-md p-3 cursor-pointer transition-all",
                                  selectedModel === model.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-accent/50 border-border/50"
                                )}
                                onClick={() => setSelectedModel(model.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-medium flex items-center gap-1.5">
                                    <span>{model.avatar}</span>
                                    <span>{model.name}</span>
                                  </div>
                                  {selectedModel === model.id && (
                                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600">Selected</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {model.description}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedFile && (
                  <Button 
                    variant="outline" 
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                    onClick={() => handleRemoveFile(selectedFile)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Remove Selected File
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="w-full border-border/50" 
                  onClick={() => {
                    if (selectedFile) {
                      const file = availableFiles.find(f => f.id === selectedFile);
                      if (file) {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(file.data, null, 2));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", file.name);
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                        toast.success(`Downloaded ${file.name}`);
                      }
                    } else {
                      toast.error("Please select a file to download");
                    }
                  }}
                  disabled={!selectedFile}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Data as JSON
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="h-[calc(100vh-220px)]">
            <Card className="border-border/50 shadow-sm h-full">
              <CardHeader className="bg-card/50 border-b border-border/30">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Data
                </CardTitle>
                <CardDescription>
                  Upload data files for AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AIFileUploader onFilesProcessed={handleFilesProcessed} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-card/50 border-b border-border/30">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Enter your API keys for AI models. Keys are stored securely in your browser's local storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* OpenAI API Key */}
                <div className="space-y-2">
                  <Label htmlFor="openai-key" className="flex items-center gap-1.5">
                    <span className="text-green-500">🟢</span> OpenAI API Key
                  </Label>
                  <Input
                    id="openai-key"
                    type="password"
                    value={openAIKey}
                    onChange={(e) => setOpenAIKey(e.target.value)}
                    placeholder="sk-..."
                    className="border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for GPT-4o Mini and GPT-4o models
                  </p>
                </div>
                
                {/* Mistral API Key */}
                <div className="space-y-2">
                  <Label htmlFor="mistral-key" className="flex items-center gap-1.5">
                    <span>🧠</span> Mistral AI API Key
                  </Label>
                  <Input
                    id="mistral-key"
                    type="password"
                    value={mistralKey}
                    onChange={(e) => setMistralKey(e.target.value)}
                    placeholder="mis-..."
                    className="border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for Mistral Small and Medium models
                  </p>
                </div>

                {/* Perplexity API Key */}
                <div className="space-y-2">
                  <Label htmlFor="perplexity-key" className="flex items-center gap-1.5">
                    <span>🦙</span> Perplexity API Key
                  </Label>
                  <Input
                    id="perplexity-key"
                    type="password"
                    value={perplexityKey}
                    onChange={(e) => setPerplexityKey(e.target.value)}
                    placeholder="pplx-..."
                    className="border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for Llama 3.1 models
                  </p>
                </div>

                {/* Local Model Info */}
                <div className="pt-2 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-900/20">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Local Model
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    The local open source model doesn't require an API key. It processes data directly in your browser for basic analysis tasks and is recommended for getting started quickly.
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    API keys are stored only in your browser's local storage and are never sent to our servers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/50 py-4 mt-auto bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p>Zip Merge Master — AI Data Assistant</p>
          <p className="mt-1">All data processing happens in your browser for privacy</p>
        </div>
      </footer>
    </div>
  );
};

export default AIInteraction;
