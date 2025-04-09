
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageCircle, Upload, Settings } from "lucide-react";
import { toast } from "sonner";
import { sessionStore } from "@/utils/sessionStore";
import { FileData } from "@/utils/fileUtils";
import UserMenu from "@/components/auth/UserMenu";
import ChatSection from "@/components/ai/ChatSection";
import UploadSection from "@/components/ai/UploadSection";
import SettingsSection from "@/components/ai/SettingsSection";
import { Message, models, processLocalAI, simulateAIResponse, getModelInfo } from "@/utils/aiUtils";

const AIInteraction: React.FC = () => {
  const [openAIKey, setOpenAIKey] = useState<string>(localStorage.getItem("openai-api-key") || "");
  const [perplexityKey, setPerplexityKey] = useState<string>(localStorage.getItem("perplexity-api-key") || "");
  const [mistralKey, setMistralKey] = useState<string>(localStorage.getItem("mistral-api-key") || "");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>("local-model");
  const [availableFiles, setAvailableFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
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

  const handleSendMessage = async (inputMessage: string) => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
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

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b py-2 px-4 bg-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-foreground hover:text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-semibold text-xl">Data AI Assistant</h1>
          </div>
          <UserMenu />
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <Tabs defaultValue="chat" className="flex flex-1 overflow-hidden">
          <div className="w-[50px] sm:w-[200px] border-r bg-muted/40 flex flex-col">
            <TabsList className="h-auto flex flex-col justify-start w-full p-1 bg-transparent">
              <TabsTrigger value="chat" className="w-full justify-start gap-2 py-2">
                <MessageCircle className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="w-full justify-start gap-2 py-2">
                <Upload className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="w-full justify-start gap-2 py-2">
                <Settings className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
              <ChatSection 
                files={availableFiles}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                models={models}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                messages={messages}
                isLoading={isLoading}
                loadingProgress={loadingProgress}
                onSendMessage={handleSendMessage}
                onClearChat={handleClearChat}
              />
            </TabsContent>
            
            <TabsContent value="upload" className="flex-1 overflow-auto mt-0">
              <UploadSection 
                files={availableFiles}
                onFilesProcessed={handleFilesProcessed}
                onRemoveFile={handleRemoveFile}
              />
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 overflow-auto mt-0">
              <SettingsSection
                openAIKey={openAIKey}
                setOpenAIKey={setOpenAIKey}
                perplexityKey={perplexityKey}
                setPerplexityKey={setPerplexityKey}
                mistralKey={mistralKey}
                setMistralKey={setMistralKey}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AIInteraction;
