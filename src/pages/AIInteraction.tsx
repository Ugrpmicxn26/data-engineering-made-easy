
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

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  requiresKey: boolean;
  isOpenSource?: boolean;
  avatar?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
}

const AIInteraction: React.FC = () => {
  const [openAIKey, setOpenAIKey] = useState<string>(localStorage.getItem("openai-api-key") || "");
  const [perplexityKey, setPerplexityKey] = useState<string>(localStorage.getItem("perplexity-api-key") || "");
  const [mistralKey, setMistralKey] = useState<string>(localStorage.getItem("mistral-api-key") || "");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>("local-model");
  const [availableFiles, setAvailableFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
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

  const handleFilesProcessed = (newFiles: FileData[]) => {
    setAvailableFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newFiles];
      sessionStore.createStore('files', updatedFiles);
      return updatedFiles;
    });

    if (newFiles.length > 0 && !selectedFile) {
      setSelectedFile(newFiles[0].id);
    }

    toast.success(`${newFiles.length} file(s) added for AI analysis`);
  };

  useEffect(() => {
    const files = sessionStore.getStore('files');
    if (files && files.length > 0) {
      setAvailableFiles(files);
      if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0].id);
      }
    }

    const savedMessages = sessionStore.getStore('ai-chat-messages');
    if (savedMessages && savedMessages.length > 0) {
      setMessages(savedMessages);
    } else {
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

  useEffect(() => {
    if (messages.length > 0) {
      sessionStore.createStore('ai-chat-messages', messages);
    }
  }, [messages]);

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

  useEffect(() => {
    let interval: number | undefined;
    
    if (isLoading) {
      setLoadingProgress(0);
      interval = window.setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 90) {
            const increment = Math.random() * 10;
            return Math.min(prev + increment, 90);
          }
          return prev;
        });
      }, 300);
    } else {
      setLoadingProgress(100);
      const timeout = setTimeout(() => {
        setLoadingProgress(0);
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const getSelectedFileData = () => {
    if (!selectedFile) return null;
    return availableFiles.find(file => file.id === selectedFile);
  };

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

  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = availableFiles.filter(file => file.id !== fileId);
    setAvailableFiles(updatedFiles);
    sessionStore.createStore('files', updatedFiles);
    
    if (selectedFile === fileId) {
      setSelectedFile(updatedFiles.length > 0 ? updatedFiles[0].id : null);
    }
    
    toast.success("File removed from AI analysis");
  };

  const getModelInfo = (modelId: string): AIModel => {
    return models.find(model => model.id === modelId) || {
      id: "unknown",
      name: "Unknown Model",
      provider: "Unknown",
      description: "Unknown model",
      requiresKey: false,
      avatar: "❓"
    };
  };

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
    
    const fileData = getSelectedFileData();
    const selectedModelInfo = models.find(model => model.id === selectedModel);
    
    try {
      const apiKey = selectedModelInfo?.provider === "OpenAI" ? openAIKey : 
                    selectedModelInfo?.provider === "Perplexity" ? perplexityKey :
                    selectedModelInfo?.provider === "Mistral AI" ? mistralKey :
                    null;
      
      if (!apiKey && selectedModelInfo?.requiresKey) {
        throw new Error(`Please provide a valid ${selectedModelInfo.provider} API key in the settings tab.`);
      }
      
      let responseContent = "";
      
      if (selectedModel === "local-model" || !selectedModelInfo?.requiresKey) {
        responseContent = await processLocalAI(userMessage.content, fileData);
      } else {
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

  // Enhanced local AI data processing with improved unique value identification
  const processLocalAI = async (prompt: string, fileData: FileData | null): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    if (!fileData) {
      return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload a file in the main application or in the Upload tab.";
    }

    const promptLower = prompt.toLowerCase();
    
    // NEW FEATURE: Handle explicit requests for unique values
    if (promptLower.includes("unique") || promptLower.includes("distinct") || promptLower.includes("list values") || 
        promptLower.includes("all values") || promptLower.includes("possible values")) {
      
      // Try to identify which column the user is asking about
      let targetColumn = null;
      for (const col of fileData.columns) {
        if (promptLower.includes(col.toLowerCase())) {
          targetColumn = col;
          break;
        }
      }
      
      if (targetColumn) {
        // Extract unique values from the column
        const uniqueValues = Array.from(new Set(
          fileData.data.map(row => row[targetColumn] || "(empty)")
        )).sort();
        
        let response = `# Unique Values in "${targetColumn}" Column\n\n`;
        response += `I found ${uniqueValues.length} unique values in column "${targetColumn}" from dataset "${fileData.name}":\n\n`;
        
        if (uniqueValues.length <= 50) {
          // Show all values if there are 50 or fewer
          response += uniqueValues.map(val => `- "${val}"`).join('\n');
        } else {
          // Show the first 30 values and a count if there are many
          response += uniqueValues.slice(0, 30).map(val => `- "${val}"`).join('\n');
          response += `\n\n...and ${uniqueValues.length - 30} more unique values. `;
          response += `The dataset has ${fileData.data.length} total rows.`;
        }
        
        // Add value counts for the most frequent values
        const valueCounts: {[key: string]: number} = {};
        fileData.data.forEach(row => {
          const val = row[targetColumn] || "(empty)";
          valueCounts[val] = (valueCounts[val] || 0) + 1;
        });
        
        const topValues = Object.entries(valueCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        
        if (topValues.length > 0) {
          response += "\n\n## Most Frequent Values\n\n";
          response += topValues.map(([val, count]) => 
            `- "${val}": ${count} occurrences (${((count/fileData.data.length)*100).toFixed(1)}% of data)`)
            .join('\n');
        }
        
        return response;
      } else {
        // No specific column mentioned
        return `Please specify which column you want to see unique values for. Available columns are: ${fileData.columns.join(", ")}`;
      }
    }
    
    if (promptLower.includes("statistics") || promptLower.includes("stats") || promptLower.includes("summary") || 
        promptLower.includes("describe") || promptLower.includes("overview")) {
      const numRows = fileData.data.length;
      const numCols = fileData.columns.length;
      
      let numericalStats = "";
      try {
        const numericColumns = fileData.columns.filter(col => 
          fileData.data.some(row => !isNaN(parseFloat(row[col])))
        );
        
        if (numericColumns.length > 0) {
          numericalStats = "\n\n**Numeric Column Statistics:**\n";
          
          for (const col of numericColumns.slice(0, 5)) {
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

      let categoricalStats = "";
      try {
        const categoricalColumns = fileData.columns.filter(col => {
          const uniqueValues = new Set(fileData.data.map(row => row[col]));
          return uniqueValues.size < Math.min(20, fileData.data.length * 0.2);
        }).slice(0, 3);
        
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
              .slice(0, 3);
              
            categoricalStats += `\n- **${col}**: ${topValues.map(([val, count]) => 
              `"${val}": ${count} rows (${(count/fileData.data.length*100).toFixed(1)}%)`).join(', ')}`;
          }
        }
      } catch (e) {
        // Skip if error
      }
      
      return `# Data Summary for "${fileData.name}"\n\n` +
        `- **Rows**: ${numRows}\n` +
        `- **Columns**: ${numCols}\n` +
        `- **Column names**: ${fileData.columns.join(", ")}\n` +
        `${numericalStats}` +
        `${categoricalStats}\n\n` +
        `**Sample Data (first 3 rows):**\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 3), null, 2)}\n\`\`\``;
    }
    
    if (promptLower.includes("count") || promptLower.includes("how many") || promptLower.includes("filter")) {
      const columnNames = fileData.columns;
      
      let targetColumn = null;
      for (const col of columnNames) {
        if (promptLower.includes(col.toLowerCase())) {
          targetColumn = col;
          break;
        }
      }
      
      if (targetColumn) {
        let operation = null;
        let comparisonValue = null;
        
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
        
        for (const { term, op } of comparisonTerms) {
          if (promptLower.includes(term)) {
            operation = op;
            
            const termIndex = promptLower.indexOf(term);
            const afterTerm = prompt.slice(termIndex + term.length).trim();
            
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
        
        const valueCounts: {[key: string]: number} = {};
        fileData.data.forEach(row => {
          const val = row[targetColumn!] || "(empty)";
          valueCounts[val] = (valueCounts[val] || 0) + 1;
        });
        
        const topValues = Object.entries(valueCounts)
          .sort((a, b) => b[1] - a[1]);
          
        let response = `Here's the distribution of values in column "${targetColumn}" from dataset "${fileData.name}":\n\n`;
        
        const valuesToShow = topValues.length <= 10 ? topValues : topValues.slice(0, 10);
        response += valuesToShow.map(([val, count]) => `- "${val}": ${count} rows (${(count/fileData.data.length*100).toFixed(1)}%)`).join('\n');
        
        if (topValues.length > 10) {
          response += `\n\n...and ${topValues.length - 10} more unique values.`;
        }
        
        return response;
      }
      
      return `The dataset "${fileData.name}" has ${fileData.data.length} rows and ${columnNames.length} columns. To filter or count specific values, please specify a column name in your question. Available columns are: ${columnNames.join(", ")}`;
    }
    
    if (promptLower.includes("chart") || promptLower.includes("plot") || promptLower.includes("graph") || 
        promptLower.includes("visualization") || promptLower.includes("visualize")) {
      const numericColumns = fileData.columns.filter(col => 
        fileData.data.some(row => !isNaN(parseFloat(row[col])))
      );
      
      const categoricalColumns = fileData.columns.filter(col => {
        const uniqueValues = new Set(fileData.data.map(row => row[col]));
        return uniqueValues.size < Math.min(fileData.data.length / 5, 20);
      });
      
      let requestedColumns = [];
      for (const col of fileData.columns) {
        if (promptLower.includes(col.toLowerCase())) {
          requestedColumns.push(col);
        }
      }
      
      if (requestedColumns.length > 0) {
        const requestedNumeric = requestedColumns.filter(col => numericColumns.includes(col));
        const requestedCategorical = requestedColumns.filter(col => categoricalColumns.includes(col));
        
        if (requestedNumeric.length > 0 && requestedCategorical.length > 0) {
          return `For visualizing the relationship between "${requestedCategorical[0]}" and "${requestedNumeric[0]}" in dataset "${fileData.name}", I recommend:\n\n` +
            `1. **Bar Chart**: Use "${requestedCategorical[0]}" on x-axis and "${requestedNumeric[0]}" on y-axis to compare values across categories.\n` +
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
    
    if (promptLower.includes("correlate") || promptLower.includes("relationship") || promptLower.includes("related") ||
        promptLower.includes("connection") || promptLower.includes("compare")) {
      
      let columnsToCompare = [];
      for (const col of fileData.columns) {
        if (promptLower.includes(col.toLowerCase())) {
          columnsToCompare.push(col);
        }
      }
      
      if (columnsToCompare.length >= 2) {
        let col1 = columnsToCompare[0];
        let col2 = columnsToCompare[1];
        
        const isCol1Numeric = fileData.data.some(row => !isNaN(parseFloat(row[col1])));
        const isCol2Numeric = fileData.data.some(row => !isNaN(parseFloat(row[col2])));
        
        if (isCol1Numeric && isCol2Numeric) {
          try {
            const validPairs = fileData.data
              .map(row => [parseFloat(row[col1]), parseFloat(row[col2])])
              .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
            
            if (validPairs.length < 5) {
              return `Not enough valid numeric pairs to calculate correlation between "${col1}" and "${col2}".`;
            }
            
            const mean1 = validPairs.reduce((sum, pair) => sum + pair[0], 0) / validPairs.length;
            const mean2 = validPairs.reduce((sum, pair) => sum + pair[1], 0) / validPairs.length;
            
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
            
            // Fixed type error by ensuring we have numbers before multiplication
            const denomProduct = Math.sqrt(Number(denom1)) * Math.sqrt(Number(denom2));
            const correlation = denomProduct !== 0 ? numerator / denomProduct : 0;
            
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
            
            let tableOutput = `### Relationship between "${col1}" and "${col2}" in dataset "${fileData.name}"\n\n`;
            tableOutput += "Here's a contingency table showing how these columns relate:\n\n";
            
            const uniqueVal1 = Object.keys(contingencyTable);
            const uniqueVal2 = new Set<string>();
            
            for (const val1 in contingencyTable) {
              for (const val2 in contingencyTable[val1]) {
                uniqueVal2.add(val2);
              }
            }
            
            const uniqueVal2Array = Array.from(uniqueVal2).sort();
            
            tableOutput += `| ${col1} \\ ${col2} | ${uniqueVal2Array.join(' | ')} | Total |\n`;
            tableOutput += `| ${'-'.repeat(col1.length)} | ${uniqueVal2Array.map(val => '-'.repeat(val.length)).join(' | ')} | ----- |\n`;
            
            for (const val1 of uniqueVal1) {
              let rowTotal = 0;
              let row = `| ${val1} | `;
              
              for (const val2 of uniqueVal2Array) {
                const count = contingencyTable[val1][val2] || 0;
                rowTotal += count;
                row += `${count} | `;
              }
              
              row += `${rowTotal} |`;
              tableOutput += row + '\n';
            }
            
            tableOutput += "\n### Insights:\n\n";
            
            let allCombinations: [string, string, number][] = [];
            for (const val1 in contingencyTable) {
              for (const val2 in contingencyTable[val1]) {
                allCombinations.push([val1, val2, contingencyTable[val1][val2]]);
              }
            }
            
            allCombinations.sort((a, b) => b[2] - a[2]);
            
            tableOutput += "Top combinations:\n";
            for (let i = 0; i < Math.min(3, allCombinations.length); i++) {
              const [val1, val2, count] = allCombinations[i];
              const percentage = (count / fileData.data.length * 100).toFixed(1);
              tableOutput += `- ${val1} with ${val2}: ${count} occurrences (${percentage}% of data)\n`;
            }
            
            return tableOutput;
          } catch (e) {
            return `Error analyzing relationship between "${col1}" and "${col2}": ${e}`;
          }
        }
      }
    }
    
    return `I can help analyze your data from "${fileData.name}". You can ask me to:
    
1. Provide statistics or a summary of the data
2. Count or filter rows based on specific criteria
3. Suggest appropriate charts for visualization
4. Analyze relationships between columns
5. Show unique values in a specific column

Your file has ${fileData.data.length} rows and columns: ${fileData.columns.join(", ")}`;
  };

  const simulateAIResponse = async (
    prompt: string, 
    fileData: FileData | null, 
    modelInfo: AIModel,
    apiKey: string | null
  ): Promise<string> => {
    const delay = modelInfo.id.includes("large") ? 3000 : 1500;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (!fileData) {
      return "I don't have any data to analyze. Please upload or select a file first.";
    }
    
    const modelName = modelInfo.name;
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes("summary") || promptLower.includes("overview")) {
      return `📊 **Data Summary** (analyzed with ${modelName})
      
Your file "${fileData.name}" contains ${fileData.data.length} rows and ${fileData.columns.length} columns.

Column names: ${fileData.columns.join(", ")}

Here's a sample of the first few rows:
\`\`\`
${JSON.stringify(fileData.data.slice(0, 2), null, 2)}
\`\`\`

Would you like me to perform a more detailed analysis on any specific aspect of this dataset?`;
    }
    
    if (promptLower.includes("compare") || promptLower.includes("correlation")) {
      return `📈 **Correlation Analysis** (performed with ${modelName})
      
To properly analyze correlations in your dataset "${fileData.name}", I'd need to know which specific columns you want to compare.

Available columns: ${fileData.columns.join(", ")}

Please specify which columns you'd like to compare, for example: "Compare the correlation between [column1] and [column2]"`;
    }
    
    return `I've analyzed your request about "${prompt.substring(0, 30)}..." using the ${modelName} model.

To provide the most helpful analysis of your data in "${fileData.name}", could you be more specific about what you're looking for? 

You can ask me to:
- Summarize the dataset
- Find statistical patterns
- Identify outliers
- Analyze specific columns
- Compare different fields
- Suggest visualizations

Let me know how I can help!`;
  };

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to App</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1 py-1.5">
            <Bot className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </Badge>
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Tabs defaultValue="chat" className="flex flex-1 overflow-hidden">
          <div className="w-full h-full flex flex-col">
            <div className="border-b">
              <div className="container mx-auto px-4">
                <TabsList className="grid grid-cols-3 my-2">
                  <TabsTrigger value="chat" className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-1.5">
                    <Upload className="w-4 h-4" />
                    <span>Upload</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-1.5">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="chat" className="h-full flex flex-col mt-0">
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-2 md:p-4 gap-4 container mx-auto">
                  <Card className="flex-1 flex flex-col h-full">
                    <CardHeader className="px-4 py-3 flex flex-row items-center justify-between space-y-0 gap-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bot className="w-5 h-5 text-primary" />
                          Data Analysis Chat
                        </CardTitle>
                        <CardDescription>
                          Ask questions about your data files
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleClearChat}
                        className="h-8"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Clear Chat
                      </Button>
                    </CardHeader>
                    <Separator />
                    {loadingProgress > 0 && (
                      <div className="px-4 py-2 bg-muted/50">
                        <Progress value={loadingProgress} className="h-1.5" />
                      </div>
                    )}
                    <CardContent className="flex-1 overflow-hidden p-0">
                      <ScrollArea className="h-full">
                        <div className="flex flex-col p-4 pb-6 space-y-6">
                          {messages.map((message) => (
                            <div 
                              key={message.id} 
                              className={cn(
                                "flex flex-col max-w-full",
                                message.role === "user" ? "items-end" : "items-start"
                              )}
                            >
                              <div 
                                className={cn(
                                  "px-4 py-3 rounded-lg shadow-sm",
                                  message.role === "user" 
                                    ? "bg-primary text-primary-foreground" 
                                    : message.role === "system"
                                    ? "bg-muted border"
                                    : "bg-card border"
                                )}
                              >
                                {message.role !== "user" && (
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                      {message.model && message.model !== "system" ? getModelInfo(message.model).avatar : "🤖"} {
                                        message.model && message.model !== "system" 
                                          ? getModelInfo(message.model).name 
                                          : message.model === "error" 
                                            ? "Error" 
                                            : "Assistant"
                                      }
                                    </span>
                                  </div>
                                )}
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  {message.content.split('\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                      {line}
                                      {i < message.content.split('\n').length - 1 && <br />}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 px-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex items-start">
                              <div className="bg-card border px-4 py-3 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                    {getModelInfo(selectedModel).avatar} {getModelInfo(selectedModel).name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                    <Separator />
                    <CardFooter className="p-4">
                      <form 
                        className="flex w-full items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                      >
                        <Textarea
                          placeholder="Ask something about your data..."
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          className="flex-1 min-h-10 h-10"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <Button 
                          type="submit" 
                          disabled={isLoading || !inputMessage.trim()}
                          size="icon"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </form>
                    </CardFooter>
                  </Card>

                  <div className="w-full md:w-72 flex flex-col gap-4">
                    <Card>
                      <CardHeader className="px-4 py-3">
                        <CardTitle className="text-base">Model Selection</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 py-2 space-y-4">
                        <Select
                          value={selectedModel}
                          onValueChange={setSelectedModel}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {models.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <span>{model.avatar}</span>
                                  <span>{model.name}</span>
                                  {model.isOpenSource && (
                                    <Badge variant="outline" className="ml-auto text-xs">Open Source</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="text-xs text-muted-foreground">
                          {getModelInfo(selectedModel).description}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="px-4 py-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>Selected Data</span>
                          {availableFiles.length > 0 && (
                            <Badge className="ml-auto">
                              {availableFiles.length} file{availableFiles.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pt-2 pb-4">
                        {availableFiles.length > 0 ? (
                          <div className="space-y-4">
                            <Select
                              value={selectedFile || ""}
                              onValueChange={setSelectedFile}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a file" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFiles.map((file) => (
                                  <SelectItem key={file.id} value={file.id}>
                                    {file.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {selectedFile && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium">
                                    {getSelectedFileData()?.name}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleRemoveFile(selectedFile)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                  <div>Columns: {getSelectedFileData()?.columns.length}</div>
                                  <div>Rows: {getSelectedFileData()?.data.length}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <div className="text-sm font-medium mb-1">No files available</div>
                            <div className="text-xs text-muted-foreground mb-3">
                              Upload files for analysis
                            </div>
                            <TabsTrigger 
                              value="upload" 
                              className="text-xs"
                              onClick={() => {
                                const uploadTab = document.querySelector('[data-value="upload"]');
                                if (uploadTab) {
                                  (uploadTab as HTMLElement).click();
                                }
                              }}
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" />
                              Upload Files
                            </TabsTrigger>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="h-full mt-0">
                <div className="container mx-auto p-4 h-full flex flex-col">
                  <Card className="flex-1 flex flex-col">
                    <CardHeader>
                      <CardTitle>Upload Files for Analysis</CardTitle>
                      <CardDescription>
                        Upload CSV, TXT, or ZIP files to analyze with AI
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                      <AIFileUploader onFilesProcessed={handleFilesProcessed} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="h-full mt-0">
                <div className="container mx-auto p-4 h-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Model Settings</CardTitle>
                      <CardDescription>
                        Configure API keys for different AI models
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="openai-key">OpenAI API Key</Label>
                        <Input
                          id="openai-key"
                          type="password"
                          placeholder="sk-..."
                          value={openAIKey}
                          onChange={(e) => setOpenAIKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Required for GPT-4o models
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="perplexity-key">Perplexity API Key</Label>
                        <Input
                          id="perplexity-key"
                          type="password"
                          placeholder="pplx-..."
                          value={perplexityKey}
                          onChange={(e) => setPerplexityKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Required for Llama 3.1 Sonar models
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mistral-key">Mistral API Key</Label>
                        <Input
                          id="mistral-key"
                          type="password"
                          placeholder="..."
                          value={mistralKey}
                          onChange={(e) => setMistralKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Required for Mistral models
                        </p>
                      </div>

                      <div className="border rounded-lg p-4 bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h3 className="font-medium">Local Model</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          The local model runs directly in your browser and doesn't require any API key. It has basic data analysis capabilities and now provides enhanced functionality for column value analysis.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AIInteraction;
