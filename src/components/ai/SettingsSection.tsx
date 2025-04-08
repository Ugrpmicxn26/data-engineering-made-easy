
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface SettingsSectionProps {
  openAIKey: string;
  setOpenAIKey: (key: string) => void;
  perplexityKey: string;
  setPerplexityKey: (key: string) => void;
  mistralKey: string;
  setMistralKey: (key: string) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  openAIKey,
  setOpenAIKey,
  perplexityKey,
  setPerplexityKey,
  mistralKey,
  setMistralKey
}) => {
  return (
    <div className="flex-1 overflow-auto mt-0 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Keys for AI Providers</CardTitle>
            <CardDescription>
              Add your API keys to use powerful cloud AI models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input 
                id="openai-key"
                type="password" 
                placeholder="sk-..." 
                value={openAIKey}
                onChange={(e) => setOpenAIKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Required for GPT-4o models</p>
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
              <p className="text-xs text-muted-foreground">Required for Llama models</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mistral-key">Mistral AI API Key</Label>
              <Input 
                id="mistral-key"
                type="password" 
                placeholder="..." 
                value={mistralKey}
                onChange={(e) => setMistralKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Required for Mistral models</p>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              <p>
                Keys are stored locally in your browser.
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Test Keys
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SettingsSection;
