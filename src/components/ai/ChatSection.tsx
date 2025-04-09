
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIModel, Message, getModelInfo } from "@/utils/aiUtils";
import { FileData } from "@/utils/fileUtils";
import { cn } from "@/lib/utils";
import { Bot, Send, RefreshCw } from "lucide-react";

interface ChatSectionProps {
  files: FileData[];
  selectedFile: string | null;
  setSelectedFile: (id: string | null) => void;
  models: AIModel[];
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  messages: Message[];
  isLoading: boolean;
  loadingProgress: number;
  onSendMessage: (message: string) => Promise<void>;
  onClearChat: () => void;
}

const ChatSection: React.FC<ChatSectionProps> = ({
  files,
  selectedFile,
  setSelectedFile,
  models,
  selectedModel,
  setSelectedModel,
  messages,
  isLoading,
  loadingProgress,
  onSendMessage,
  onClearChat
}) => {
  const [inputMessage, setInputMessage] = useState("");

  const handleSend = async () => {
    if (!inputMessage.trim()) return;
    await onSendMessage(inputMessage);
    setInputMessage("");
  };

  return (
    <div className="flex-1 flex flex-col mt-0 overflow-hidden">
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Select value={selectedFile || ""} onValueChange={setSelectedFile} disabled={files.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a data file" />
            </SelectTrigger>
            <SelectContent>
              {files.length > 0 ? (
                files.map(file => (
                  <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>No files available</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={onClearChat} title="Clear chat">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {models.map(model => (
            <Button 
              key={model.id} 
              variant={selectedModel === model.id ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-1.5 h-8 text-xs rounded-md"
              onClick={() => setSelectedModel(model.id)}
            >
              <span className="w-4 text-center">{model.avatar}</span>
              <span className="hidden sm:inline">{model.name}</span>
            </Button>
          ))}
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-20">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No messages yet. Start a conversation with your data.</p>
            </div>
          ) : (
            messages.map(message => (
              <Card key={message.id} className={cn(
                "overflow-hidden",
                message.role === "user" ? "bg-muted" : "bg-card",
                message.role === "system" && "border-yellow-500/30 bg-yellow-500/5"
              )}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground shrink-0">
                      {message.role === "user" ? "U" : message.role === "system" ? "S" : "A"}
                    </div>
                    <div className="text-sm font-medium">
                      {message.role === "user" ? "You" : message.role === "system" ? "System" : "AI Assistant"}
                    </div>
                    {message.model && message.role === "assistant" && (
                      <Badge variant="outline" className="text-xs">
                        {getModelInfo(message.model).name}
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground ml-auto">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </Card>
            ))
          )}
          
          {isLoading && (
            <div className="space-y-2">
              <Progress value={loadingProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">AI is analyzing your data...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-background">
        <div className="max-w-3xl mx-auto">
          <form 
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="flex-1">
              <Textarea 
                placeholder="Ask something about your data..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="min-h-[60px] resize-none border"
                disabled={isLoading || files.length === 0}
              />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              disabled={!inputMessage.trim() || isLoading || files.length === 0}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;
