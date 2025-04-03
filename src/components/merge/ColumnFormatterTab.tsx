
import React, { useState, useEffect } from "react";
import { SplitSquareHorizontal, PlusCircle, Trash2, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps } from "./types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateCSV } from "@/utils/fileUtils";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  sourceFileId: z.string().min(1, "Please select a file"),
  sourceColumn: z.string().min(1, "Please select a column"),
  separator: z.string().min(1, "Please enter a separator"),
  outputFormat: z.string().min(1, "Please enter an output format"),
  newColumnName: z.string().min(1, "Please enter a column name"),
  paddingType: z.enum(["none", "zeroPad", "leftPad", "rightPad"]),
  applyToAll: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

// Component for formatting columna by splitting and merging with padding options
const ColumnFormatterTab: React.FC<ActionTabProps> = ({ 
  files,
  selectedFiles,
  isProcessing, 
  onComplete 
}) => {
  const [mode, setMode] = useState<"split" | "merge">("split");
  const [currentSample, setCurrentSample] = useState<string | null>(null);
  const [paddingConfig, setPaddingConfig] = useState<Array<{
    index: number;
    enabled: boolean;
    length: number;
    padChar: string;
  }>>([]);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [formatParts, setFormatParts] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceFileId: "",
      sourceColumn: "",
      separator: "_",
      outputFormat: "{0}_{1}_{2}",
      newColumnName: "",
      paddingType: "zeroPad",
      applyToAll: false
    }
  });

  const sourceFileId = form.watch("sourceFileId");
  const sourceColumn = form.watch("sourceColumn");
  const separator = form.watch("separator");
  const outputFormat = form.watch("outputFormat");
  const paddingType = form.watch("paddingType");

  // Reset form values when mode changes
  useEffect(() => {
    if (mode === "split") {
      form.setValue("outputFormat", "{0}_{1}_{2}");
    } else {
      form.setValue("outputFormat", "");
    }
    setPreviewResult(null);
    setCurrentSample(null);
  }, [mode, form]);

  // Update available columns when file selection changes
  useEffect(() => {
    if (sourceFileId) {
      form.setValue("sourceColumn", "");
      form.setValue("newColumnName", "");
      setCurrentSample(null);
      setPreviewResult(null);
      setPaddingConfig([]);
      setFormatParts([]);
    }
  }, [sourceFileId, form]);

  // Update sample and format parts when column selection changes
  useEffect(() => {
    if (sourceFileId && sourceColumn) {
      const sourceFile = files.find(f => f.id === sourceFileId);
      if (sourceFile?.data && sourceFile.data.length > 0) {
        // Find first non-empty value for the selected column
        const sampleValue = sourceFile.data.find(row => 
          row[sourceColumn] && String(row[sourceColumn]).trim() !== ""
        )?.[sourceColumn];
        
        if (sampleValue) {
          setCurrentSample(String(sampleValue));
          
          if (mode === "split" && separator) {
            const parts = String(sampleValue).split(separator);
            setFormatParts(parts);
            
            // Initialize padding configuration for each part
            setPaddingConfig(parts.map((_, index) => ({
              index,
              enabled: false,
              length: parts[index]?.length || 0,
              padChar: "0"
            })));
          }
        } else {
          setCurrentSample(null);
          setFormatParts([]);
          setPaddingConfig([]);
        }
      }
      
      // Set default new column name
      if (mode === "split") {
        form.setValue("newColumnName", `${sourceColumn}_formatted`);
      } else {
        form.setValue("newColumnName", `${sourceColumn}_merged`);
      }
    }
  }, [sourceFileId, sourceColumn, mode, separator, form, files]);

  const getColumns = () => {
    const sourceFile = files.find(f => f.id === sourceFileId);
    return sourceFile?.columns || [];
  };

  const updatePaddingConfig = (index: number, field: keyof typeof paddingConfig[0], value: any) => {
    setPaddingConfig(prev => 
      prev.map(config => 
        config.index === index ? { ...config, [field]: value } : config
      )
    );
  };

  const handlePreviewFormat = () => {
    if (!currentSample) return;
    
    try {
      if (mode === "split") {
        // Process the sample value according to the padding configuration
        const parts = currentSample.split(separator);
        const processedParts = parts.map((part, idx) => {
          const config = paddingConfig.find(c => c.index === idx);
          
          if (config?.enabled) {
            if (paddingType === "zeroPad" || paddingType === "leftPad") {
              return part.padStart(config.length, config.padChar);
            } else if (paddingType === "rightPad") {
              return part.padEnd(config.length, config.padChar);
            }
          }
          return part;
        });
        
        // Replace placeholders in the output format with processed values
        let result = outputFormat;
        processedParts.forEach((part, idx) => {
          result = result.replace(`{${idx}}`, part);
        });
        
        setPreviewResult(result);
      } else {
        setPreviewResult("Merge preview will be available in the next update");
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Error generating preview");
    }
  };

  const handleSubmit = (values: FormValues) => {
    if (isProcessing) return;
    
    try {
      const sourceFile = files.find(f => f.id === values.sourceFileId);
      if (!sourceFile || !sourceFile.data || sourceFile.data.length === 0) {
        toast.error("Source file data not found");
        return;
      }

      // Process data based on mode
      const processedData = sourceFile.data.map(row => {
        const newRow = { ...row };
        const sourceValue = String(row[values.sourceColumn] || "");
        
        if (mode === "split" && sourceValue) {
          const parts = sourceValue.split(values.separator);
          
          // Apply padding to each part according to configuration
          const processedParts = parts.map((part, idx) => {
            const config = paddingConfig.find(c => c.index === idx);
            
            if (config?.enabled) {
              if (values.paddingType === "zeroPad" || values.paddingType === "leftPad") {
                return part.padStart(config.length, config.padChar);
              } else if (values.paddingType === "rightPad") {
                return part.padEnd(config.length, config.padChar);
              }
            }
            return part;
          });
          
          // Build the formatted output using the template
          let formattedValue = values.outputFormat;
          processedParts.forEach((part, idx) => {
            formattedValue = formattedValue.replace(`{${idx}}`, part);
          });
          
          newRow[values.newColumnName] = formattedValue;
          
          // If apply to all is checked, replace the source column
          if (values.applyToAll) {
            newRow[values.sourceColumn] = formattedValue;
          }
        }
        
        return newRow;
      });

      // Update file with the processed data
      const updatedFile = {
        ...sourceFile,
        data: processedData,
        columns: values.applyToAll 
          ? sourceFile.columns 
          : [...sourceFile.columns, values.newColumnName],
        content: generateCSV(processedData),
        size: new Blob([generateCSV(processedData)]).size
      };

      const updatedFiles = files.map(file => 
        file.id === values.sourceFileId ? updatedFile : file
      );
      
      onComplete(processedData, updatedFiles);
      toast.success(`Successfully formatted column "${values.sourceColumn}"`);
    } catch (error) {
      console.error("Error formatting column:", error);
      toast.error("Failed to format column");
    }
  };

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Split & Format Columns" 
        description="Split column values by a separator, apply custom formatting, and create new formatted columns."
      />
      
      <Tabs 
        value={mode} 
        onValueChange={(value) => setMode(value as "split" | "merge")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="split" className="flex gap-1.5 items-center">
            <SplitSquareHorizontal className="h-3.5 w-3.5" />
            Split & Format
          </TabsTrigger>
          <TabsTrigger value="merge" className="flex gap-1.5 items-center">
            <ArrowRight className="h-3.5 w-3.5" />
            Merge Columns
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField
                  control={form.control}
                  name="sourceFileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select File</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a file" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedFiles.map(file => (
                            <SelectItem key={file.id} value={file.id}>
                              {file.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sourceColumn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Column</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!sourceFileId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a column" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getColumns().map(column => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {mode === "split" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="separator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Separator</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. _" />
                          </FormControl>
                          <FormDescription>
                            Character used to split the column (e.g. "_")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="newColumnName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Column Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter new column name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {currentSample && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Sample Value</h4>
                      <div className="p-2 bg-muted rounded-md text-sm font-mono">
                        {currentSample}
                      </div>
                      
                      {formatParts.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Parts After Split</h4>
                          <div className="flex flex-wrap gap-2">
                            {formatParts.map((part, idx) => (
                              <Badge key={idx} variant="outline" className="py-1 px-2">
                                <span className="text-xs mr-1 opacity-70">Part {idx}:</span> 
                                <span className="font-mono">{part}</span>
                              </Badge>
                            ))}
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Padding Configuration</h4>
                              <FormField
                                control={form.control}
                                name="paddingType"
                                render={({ field }) => (
                                  <FormItem className="mb-2">
                                    <div className="flex items-center gap-4">
                                      <FormLabel className="min-w-[80px]">Padding Type</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select padding type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="none">No Padding</SelectItem>
                                          <SelectItem value="zeroPad">Zero Padding</SelectItem>
                                          <SelectItem value="leftPad">Left Padding</SelectItem>
                                          <SelectItem value="rightPad">Right Padding</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {paddingType !== "none" && (
                              <div className="space-y-3">
                                {paddingConfig.map((config, idx) => (
                                  <div key={idx} className="flex items-center gap-3 p-2 border rounded-md bg-background">
                                    <div className="flex items-center">
                                      <Switch 
                                        checked={config.enabled}
                                        onCheckedChange={(checked) => updatePaddingConfig(config.index, 'enabled', checked)}
                                      />
                                      <Label className="ml-2">Part {config.index}</Label>
                                    </div>
                                    
                                    <div className="flex gap-2 items-center">
                                      <Input 
                                        type="number" 
                                        min={1}
                                        className="w-20"
                                        value={config.length} 
                                        onChange={(e) => updatePaddingConfig(config.index, 'length', parseInt(e.target.value) || 0)}
                                        disabled={!config.enabled}
                                      />
                                      <span className="text-sm">digits</span>
                                    </div>
                                    
                                    <div className="flex gap-2 items-center">
                                      <Input 
                                        type="text" 
                                        maxLength={1}
                                        className="w-14"
                                        value={config.padChar} 
                                        onChange={(e) => updatePaddingConfig(config.index, 'padChar', e.target.value || "0")}
                                        disabled={!config.enabled}
                                      />
                                      <span className="text-sm">pad char</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4">
                            <FormField
                              control={form.control}
                              name="outputFormat"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Output Format Template</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g. {0}_{1}_{2}" />
                                  </FormControl>
                                  <FormDescription>
                                    Use {`{0}`}, {`{1}`}, etc. as placeholders for each part
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="mt-4">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={handlePreviewFormat}
                            >
                              Preview Format
                            </Button>
                            
                            {previewResult && (
                              <div className="mt-2">
                                <h4 className="text-sm font-medium mb-1">Preview Result</h4>
                                <div className="p-2 bg-muted rounded-md text-sm font-mono">
                                  {previewResult}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {mode === "merge" && (
                <div className="p-4 text-center text-muted-foreground">
                  <p>Column merging functionality will be available in the next update.</p>
                </div>
              )}
              
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="applyToAll"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Replace original column</FormLabel>
                        <FormDescription>
                          Apply formatting to all values in the original column
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-center mt-6">
            <Button
              type="submit"
              disabled={!sourceFileId || !sourceColumn || isProcessing}
              className="hover-scale"
            >
              {isProcessing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Apply Format
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ColumnFormatterTab;
