
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
import { MessageCircle, Bot, Send, Settings, Database, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
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
        content: "Hello! I'm your AI assistant. Upload data files in the main app, and I can help you analyze them. For cloud-based models, please provide your API key in the settings tab to get started. You can also use the local model which doesn't require an API key.",
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
      return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload a file in the main application.";
    }
    
    // Basic data analysis functions
    if (prompt.toLowerCase().includes("statistics") || prompt.toLowerCase().includes("stats") || prompt.toLowerCase().includes("summary")) {
      return `Here's a summary of the data in "${fileData.name}":\n\n` +
        `- Total rows: ${fileData.data.length}\n` +
        `- Columns: ${fileData.columns.join(", ")}\n` +
        `- First few rows: ${JSON.stringify(fileData.data.slice(0, 2), null, 2)}`;
    }
    
    // Count rows matching a condition
    if (prompt.toLowerCase().includes("count") || prompt.toLowerCase().includes("how many")) {
      // This is a very simplified implementation
      const columnNames = fileData.columns;
      return `The data in "${fileData.name}" has ${fileData.data.length} rows and ${columnNames.length} columns (${columnNames.join(", ")}). For more specific counting operations, please specify the column and condition.`;
    }

    // Generate a simple chart description (in a real implementation, you could actually generate charts)
    if (prompt.toLowerCase().includes("chart") || prompt.toLowerCase().includes("plot") || prompt.toLowerCase().includes("graph")) {
      return `For data visualization, I recommend using column "${fileData.columns[0]}" as your x-axis and exploring relationships with other columns. The data contains ${fileData.data.length} rows which should provide enough points for meaningful visualization.`;
    }
    
    // Return a generic response about the data
    return `I've analyzed the data in "${fileData.name}" using the local model. It contains ${fileData.data.length} rows and ${fileData.columns.length} columns. What specific insights would you like me to provide about this dataset?`;
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
      return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload a file in the main application.";
    }
    
    // Check if the prompt is asking about data stats
    if (prompt.toLowerCase().includes("statistics") || prompt.toLowerCase().includes("stats") || prompt.toLowerCase().includes("summary")) {
      return `Here's a summary of the data in "${fileData.name}":\n\n` +
        `- Total rows: ${fileData.data.length}\n` +
        `- Columns: ${fileData.columns.join(", ")}\n` +
        `- First few rows: ${JSON.stringify(fileData.data.slice(0, 2), null, 2)}`;
    }
    
    // Return a generic response about the data
    return `I've analyzed the data in "${fileData.name}" using the ${model.name} model. It contains ${fileData.data.length} rows and ${fileData.columns.length} columns. What specific insights would you like me to provide about this dataset?`;
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>Back</span>
              </Link>
              <Separator orientation="vertical" className="h-6 mx-2" />
              <h1 className="text-2xl font-medium tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
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
            <TabsList>
              <TabsTrigger value="chat" className="flex gap-1.5 items-center">
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex gap-1.5 items-center">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="h-[calc(100vh-220px)] flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
              <Card className="md:col-span-3 flex flex-col h-full">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>AI Chat</CardTitle>
                      <CardDescription>
                        Chat with AI about your data
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedFile || ""}
                        onValueChange={setSelectedFile}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a file" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFiles.length > 0 ? (
                            availableFiles.map(file => (
                              <SelectItem key={file.id} value={file.id}>
                                {file.name}
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
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <div className="space-y-4 p-1">
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
                              message.role === "user" ? "bg-primary text-primary-foreground" : 
                              message.role === "assistant" ? "bg-secondary text-secondary-foreground" :
                              "bg-destructive/10 text-destructive text-sm"
                            )}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="rounded-lg p-4 max-w-[80%] bg-secondary text-secondary-foreground opacity-70">
                            <div className="flex items-center gap-2">
                              <div className="animate-pulse">AI is thinking...</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter>
                  <div className="flex items-end w-full gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message..."
                      className="min-h-[60px]"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className={cn(
                        "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
                        "shrink-0"
                      )}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              <div className="space-y-4">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <span>AI Model</span>
                    </CardTitle>
                    <CardDescription>Select the AI model to use</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* OpenAI Models */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">OpenAI Models</Label>
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
                                    : "hover:bg-secondary/50"
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
                        <Label className="text-xs text-muted-foreground">Perplexity Models</Label>
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
                                    : "hover:bg-secondary/50"
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

                      {/* Open Source Model */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Open Source Model</Label>
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
                                    : "hover:bg-secondary/50"
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

                <Button variant="outline" className="w-full" onClick={handleClearChat}>
                  Clear Chat History
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Enter your API keys for AI models. Keys are stored securely in your browser's local storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* OpenAI API Key */}
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    value={openAIKey}
                    onChange={(e) => setOpenAIKey(e.target.value)}
                    placeholder="sk-..."
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for Llama 3.1 models
                  </p>
                </div>

                {/* Local Model Info */}
                <div className="pt-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h3 className="font-medium mb-1">Local Model</h3>
                  <p className="text-sm text-muted-foreground">
                    The local open source model doesn't require an API key. It processes data directly in your browser for basic analysis tasks.
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

      <footer className="border-t border-border py-6 mt-auto bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p>Zip Merge Master — AI Data Assistant</p>
          <p className="mt-1">All data processing happens in your browser for privacy</p>
        </div>
      </footer>
    </div>
  );
};

export default AIInteraction;
