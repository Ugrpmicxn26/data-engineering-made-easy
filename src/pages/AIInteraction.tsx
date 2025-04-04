
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
import { toast } from "sonner";
import UserMenu from "@/components/auth/UserMenu";
import { sessionStore } from "@/utils/sessionStore";
import { FileData } from "@/utils/fileUtils";
import { Link } from "react-router-dom";
import { MessageCircle, Bot, Send, Settings, Database, ArrowLeft, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import AIFileUploader from "@/components/ai/AIFileUploader";

// Define AI model types
interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  requiresKey: boolean;
}

// Define message types
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

const AIInteraction: React.FC = () => {
  // State for API keys
  const [openAIKey, setOpenAIKey] = useState<string>(localStorage.getItem("openai-api-key") || "");
  const [perplexityKey, setPerplexityKey] = useState<string>(localStorage.getItem("perplexity-api-key") || "");
  
  // State for chat and data
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("local-model");
  const [availableFiles, setAvailableFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  // Models definition
  const models: AIModel[] = [
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "OpenAI",
      description: "Fast and efficient model for most tasks",
      requiresKey: true
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      description: "More powerful model with advanced reasoning",
      requiresKey: true
    },
    {
      id: "gpt-4.5-preview",
      name: "GPT-4.5 Preview",
      provider: "OpenAI",
      description: "Latest OpenAI model with enhanced capabilities",
      requiresKey: true
    },
    {
      id: "llama-3.1-sonar-small-128k-online",
      name: "Llama 3.1 Sonar Small",
      provider: "Perplexity",
      description: "Efficient model for general tasks",
      requiresKey: true
    },
    {
      id: "llama-3.1-sonar-large-128k-online",
      name: "Llama 3.1 Sonar Large",
      provider: "Perplexity",
      description: "More powerful model with enhanced reasoning",
      requiresKey: true
    },
    {
      id: "local-model",
      name: "Local Model",
      provider: "Open Source",
      description: "Fast local processing with no API key required",
      requiresKey: false
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
        content: "Hello! I'm your AI data assistant. Upload data files in the main app or using the upload tab, and I can help you analyze them. For cloud-based models, please provide your API key in the settings tab to get started. You can also use the local model which doesn't require an API key.",
        timestamp: Date.now()
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
  }, [openAIKey, perplexityKey]);
  
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
      timestamp: Date.now()
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
                    null;
      
      if (!apiKey && selectedModelInfo?.requiresKey) {
        throw new Error(`Please provide a valid ${selectedModelInfo.provider} API key in the settings tab.`);
      }
      
      // For the local model, don't require a key
      if (selectedModel === "local-model" || !selectedModelInfo?.requiresKey) {
        // Process locally
        const responseContent = await processLocalAI(userMessage.content, fileData);
        
        const aiResponse: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: responseContent,
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, aiResponse]);
        return;
      }
      
      // In a real implementation, we would send a request to the AI API here
      // For this demo, we'll simulate a response
      const responseContent = await simulateAIResponse(userMessage.content, fileData, selectedModelInfo, apiKey);
      
      const aiResponse: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseContent,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      // Add an error message to the chat
      const errorMessage: Message = {
        id: `system-error-${Date.now()}`,
        role: "system",
        content: `Error: ${error.message || "Failed to get AI response. Please try again."}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error(error.message || "Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  // Process data with local AI (open source model simulation)
  const processLocalAI = async (prompt: string, fileData: FileData | null): Promise<string> => {
    // Simulate network delay (shorter than cloud models)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!fileData) {
      return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload a file in the main application or in the Upload tab.";
    }
    
    // Enhanced data analysis functions for better responsiveness
    if (prompt.toLowerCase().includes("statistics") || prompt.toLowerCase().includes("stats") || prompt.toLowerCase().includes("summary")) {
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
          
          for (const col of numericColumns.slice(0, 3)) { // Limit to first 3 columns for brevity
            const values = fileData.data
              .map(row => parseFloat(row[col]))
              .filter(val => !isNaN(val));
              
            if (values.length > 0) {
              const sum = values.reduce((a, b) => a + b, 0);
              const avg = sum / values.length;
              const min = Math.min(...values);
              const max = Math.max(...values);
              
              numericalStats += `\n- **${col}**: Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}, Avg: ${avg.toFixed(2)}`;
            }
          }
        }
      } catch (e) {
        numericalStats = "\n\nCould not calculate numerical statistics for this dataset.";
      }
      
      return `# Data Summary for "${fileData.name}"\n\n` +
        `- **Rows**: ${numRows}\n` +
        `- **Columns**: ${numCols}\n` +
        `- **Column names**: ${fileData.columns.join(", ")}\n` +
        `${numericalStats}\n\n` +
        `**Sample Data (first 3 rows):**\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 3), null, 2)}\n\`\`\``;
    }
    
    // Count rows matching a condition
    if (prompt.toLowerCase().includes("count") || prompt.toLowerCase().includes("how many")) {
      const columnNames = fileData.columns;
      
      // Try to extract column name and value from the prompt
      let targetColumn = null;
      for (const col of columnNames) {
        if (prompt.toLowerCase().includes(col.toLowerCase())) {
          targetColumn = col;
          break;
        }
      }
      
      if (targetColumn) {
        // Look for values in the prompt that might be in the column
        const uniqueValues = [...new Set(fileData.data.map(row => row[targetColumn!]))];
        let targetValue = null;
        
        for (const val of uniqueValues) {
          if (prompt.toLowerCase().includes(val.toLowerCase())) {
            targetValue = val;
            break;
          }
        }
        
        if (targetValue) {
          const count = fileData.data.filter(row => row[targetColumn!] === targetValue).length;
          return `There are ${count} rows where ${targetColumn} equals "${targetValue}" in the dataset "${fileData.name}".`;
        }
        
        // If no specific value was found but we have a column, show distribution
        const valueCounts: {[key: string]: number} = {};
        fileData.data.forEach(row => {
          const val = row[targetColumn!];
          valueCounts[val] = (valueCounts[val] || 0) + 1;
        });
        
        const topValues = Object.entries(valueCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
          
        return `Here's the distribution of values in column "${targetColumn}" from dataset "${fileData.name}":\n\n` +
          topValues.map(([val, count]) => `- "${val}": ${count} rows (${(count/fileData.data.length*100).toFixed(1)}%)`).join('\n');
      }
      
      return `The dataset "${fileData.name}" has ${fileData.data.length} rows and ${columnNames.length} columns (${columnNames.join(", ")}). To count specific values, please specify a column name in your question.`;
    }

    // Generate a simple chart description (in a real implementation, you could actually generate charts)
    if (prompt.toLowerCase().includes("chart") || prompt.toLowerCase().includes("plot") || prompt.toLowerCase().includes("graph")) {
      // Identify potential columns for visualization
      const numericColumns = fileData.columns.filter(col => 
        fileData.data.some(row => !isNaN(parseFloat(row[col])))
      );
      
      const categoricalColumns = fileData.columns.filter(col => 
        !numericColumns.includes(col) && 
        new Set(fileData.data.map(row => row[col])).size < Math.min(fileData.data.length / 5, 20)
      );
      
      if (numericColumns.length > 0 && categoricalColumns.length > 0) {
        return `For data visualization of "${fileData.name}", I recommend:\n\n` +
          `1. A bar chart using "${categoricalColumns[0]}" on x-axis and "${numericColumns[0]}" on y-axis\n` + 
          `2. A scatter plot comparing "${numericColumns[0]}" vs "${numericColumns.length > 1 ? numericColumns[1] : numericColumns[0]}"\n` +
          `3. A pie chart showing the distribution of "${categoricalColumns[0]}"\n\n` +
          `For more specific visualizations, please ask about specific columns you're interested in.`;
      } else if (numericColumns.length > 0) {
        return `I recommend creating a histogram or line chart for the numerical column "${numericColumns[0]}" in your dataset "${fileData.name}". This can help visualize the distribution of values.`;
      } else if (categoricalColumns.length > 0) {
        return `I recommend creating a bar chart or pie chart for the categorical column "${categoricalColumns[0]}" in your dataset "${fileData.name}". This will show the frequency of each category.`;
      }
      
      return `For data visualization of "${fileData.name}", I would need more information about what aspects of the data you want to visualize. The dataset contains ${fileData.data.length} rows and columns: ${fileData.columns.join(", ")}`;
    }
    
    // Handle specific data questions
    if (prompt.toLowerCase().includes("find") || prompt.toLowerCase().includes("where") || prompt.toLowerCase().includes("which")) {
      // Try to extract column name from the prompt
      let targetColumn = null;
      for (const col of fileData.columns) {
        if (prompt.toLowerCase().includes(col.toLowerCase())) {
          targetColumn = col;
          break;
        }
      }
      
      if (targetColumn) {
        // Look for potential comparison operators and values
        const operators = ["greater than", "less than", "equal to", "equals", "is", "contains", "maximum", "minimum", "highest", "lowest"];
        let operation = null;
        let comparisonValue = null;
        
        for (const op of operators) {
          if (prompt.toLowerCase().includes(op)) {
            operation = op;
            
            // Try to extract a value after the operator
            const opIndex = prompt.toLowerCase().indexOf(op);
            const afterOp = prompt.slice(opIndex + op.length).trim();
            const valueMatch = afterOp.match(/^["\s]*([^"\s]+|"[^"]+")[?\s\.,]/);
            
            if (valueMatch) {
              comparisonValue = valueMatch[1].replace(/"/g, '');
            }
            
            break;
          }
        }
        
        if (operation) {
          let result;
          
          if (operation === "maximum" || operation === "highest") {
            // Find the maximum value in the column
            try {
              const maxRow = fileData.data.reduce((max, row) => {
                const val = parseFloat(row[targetColumn!]);
                if (!isNaN(val) && (isNaN(parseFloat(max[targetColumn!])) || val > parseFloat(max[targetColumn!]))) {
                  return row;
                }
                return max;
              }, { [targetColumn!]: 'NaN' });
              
              result = `The maximum value in "${targetColumn}" is ${maxRow[targetColumn!]}.`;
              
              // Add more context about this row
              const otherCols = fileData.columns.filter(c => c !== targetColumn).slice(0, 3);
              if (otherCols.length > 0) {
                result += ` This row also has: ${otherCols.map(c => `${c} = ${maxRow[c]}`).join(", ")}.`;
              }
            } catch (e) {
              result = `I couldn't determine the maximum value for column "${targetColumn}". This might not be a numeric column.`;
            }
          } else if (operation === "minimum" || operation === "lowest") {
            // Find the minimum value
            try {
              const minRow = fileData.data.reduce((min, row) => {
                const val = parseFloat(row[targetColumn!]);
                if (!isNaN(val) && (isNaN(parseFloat(min[targetColumn!])) || val < parseFloat(min[targetColumn!]))) {
                  return row;
                }
                return min;
              }, { [targetColumn!]: 'Infinity' });
              
              result = `The minimum value in "${targetColumn}" is ${minRow[targetColumn!]}.`;
              
              // Add more context about this row
              const otherCols = fileData.columns.filter(c => c !== targetColumn).slice(0, 3);
              if (otherCols.length > 0) {
                result += ` This row also has: ${otherCols.map(c => `${c} = ${minRow[c]}`).join(", ")}.`;
              }
            } catch (e) {
              result = `I couldn't determine the minimum value for column "${targetColumn}". This might not be a numeric column.`;
            }
          } else if (comparisonValue) {
            // Perform the comparison
            let filteredRows;
            
            if (operation.includes("greater")) {
              filteredRows = fileData.data.filter(row => {
                const val = parseFloat(row[targetColumn!]);
                return !isNaN(val) && val > parseFloat(comparisonValue!);
              });
            } else if (operation.includes("less")) {
              filteredRows = fileData.data.filter(row => {
                const val = parseFloat(row[targetColumn!]);
                return !isNaN(val) && val < parseFloat(comparisonValue!);
              });
            } else if (operation.includes("equal") || operation.includes("is")) {
              filteredRows = fileData.data.filter(row => 
                row[targetColumn!].toString().toLowerCase() === comparisonValue!.toLowerCase()
              );
            } else if (operation.includes("contains")) {
              filteredRows = fileData.data.filter(row => 
                row[targetColumn!].toString().toLowerCase().includes(comparisonValue!.toLowerCase())
              );
            }
            
            if (filteredRows && filteredRows.length > 0) {
              result = `Found ${filteredRows.length} rows where ${targetColumn} ${operation} ${comparisonValue}.\n\n`;
              
              if (filteredRows.length <= 3) {
                result += `Here are the matching rows:\n\`\`\`\n${JSON.stringify(filteredRows, null, 2)}\n\`\`\``;
              } else {
                result += `Here are the first 3 matching rows:\n\`\`\`\n${JSON.stringify(filteredRows.slice(0, 3), null, 2)}\n\`\`\``;
              }
            } else {
              result = `No rows found where ${targetColumn} ${operation} ${comparisonValue}.`;
            }
          }
          
          if (result) return result;
        }
      }
    }
    
    // Return a generic response about the data with more helpful information
    return `I've analyzed the data in "${fileData.name}" which contains ${fileData.data.length} rows and ${fileData.columns.length} columns. 

Here are some questions you can ask about this data:
- "Show me statistics for this dataset"
- "Count how many rows have [specific value] in [column name]"
- "Find the maximum value in [column name]"
- "Which rows have [column name] greater than [value]?"
- "Create a chart for [column name]"

Or ask me something specific about the columns: ${fileData.columns.join(", ")}`;
  };
  
  // Simulated AI response function (in a real app, this would call an actual AI API)
  const simulateAIResponse = async (prompt: string, fileData: FileData | null, model: AIModel | undefined, apiKey: string): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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
    
    // Check if the prompt is asking about data stats
    if (prompt.toLowerCase().includes("statistics") || prompt.toLowerCase().includes("stats") || prompt.toLowerCase().includes("summary")) {
      return `# Data Summary for "${fileData.name}" (analyzed with ${model.name})\n\n` +
        `- **Rows**: ${fileData.data.length}\n` +
        `- **Columns**: ${fileData.columns.length}\n` +
        `- **Column names**: ${fileData.columns.join(", ")}\n\n` +
        `**Sample Data (first 3 rows):**\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 3), null, 2)}\n\`\`\`\n\n` +
        `I can perform more detailed analysis if you ask specific questions about the data.`;
    }
    
    // Return a generic response about the data
    return `I've analyzed the data in "${fileData.name}" using the ${model.name} model. The dataset contains ${fileData.data.length} rows and ${fileData.columns.length} columns.\n\n` +
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm sticky top-0 z-50">
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
                  AI Data Assistant
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
                      <CardTitle>Chat with AI</CardTitle>
                      <CardDescription>
                        Ask questions about your data
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedFile || ""}
                        onValueChange={setSelectedFile}
                      >
                        <SelectTrigger className="w-[180px] bg-background border-border/50">
                          <SelectValue placeholder="Select a file" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFiles.length > 0 ? (
                            availableFiles.map(file => (
                              <SelectItem key={file.id} value={file.id} className="flex justify-between items-center">
                                <span className="truncate max-w-[150px]">{file.name}</span>
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
                  <ScrollArea className="h-[calc(100vh-380px)] px-6 py-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.role === "user" ? "justify-end" : "justify-start",
                            message.role === "system" && "justify-center"
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-lg p-4 max-w-[80%]",
                              message.role === "user" 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                                : message.role === "assistant" 
                                  ? "bg-card border border-border/50 shadow-sm" 
                                  : "bg-destructive/10 text-destructive text-sm"
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
                  <div className="flex items-end w-full gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask a question about your data..."
                      className="min-h-[60px] resize-none border-border/50"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim() || (!selectedFile && availableFiles.length > 0)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {availableFiles.length > 0 && !selectedFile && (
                    <div className="w-full mt-2">
                      <p className="text-sm text-amber-600 dark:text-amber-400">Please select a file to analyze</p>
                    </div>
                  )}
                </CardFooter>
              </Card>

              <div className="space-y-4">
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="bg-card/50 border-b border-border/30">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <span>AI Model</span>
                    </CardTitle>
                    <CardDescription>Select the AI model to use</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {/* Open Source Model - Put first for emphasis */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-semibold">Open Source Model</Label>
                        <div className="space-y-2">
                          {models
                            .filter(model => model.provider === "Open Source")
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
                                  <div className="font-medium">{model.name}</div>
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
                                  <div className="font-medium">{model.name}</div>
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
                                  <div className="font-medium">{model.name}</div>
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

                <Button 
                  variant="outline" 
                  className="w-full border-border/50" 
                  onClick={handleClearChat}
                >
                  Clear Chat History
                </Button>

                {selectedFile && (
                  <Button 
                    variant="outline" 
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                    onClick={() => handleRemoveFile(selectedFile)}
                  >
                    Remove Selected File
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="h-[calc(100vh-220px)]">
            <Card className="border-border/50 shadow-sm h-full">
              <CardHeader className="bg-card/50 border-b border-border/30">
                <CardTitle>Upload Data</CardTitle>
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
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Enter your API keys for AI models. Keys are stored securely in your browser's local storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* OpenAI API Key */}
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    value={openAIKey}
                    onChange={(e) => setOpenAIKey(e.target.value)}
                    placeholder="sk-..."
                    className="border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for GPT-4o Mini, GPT-4o and GPT-4.5 Preview models
                  </p>
                </div>

                {/* Perplexity API Key */}
                <div className="space-y-2">
                  <Label htmlFor="perplexity-key">Perplexity API Key</Label>
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
