import React, { useState, useEffect } from "react";
import { SplitSquareHorizontal, PlusCircle, Trash2, ArrowRight, Check, FilePlus2, ArrowRightLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ConfigHeader from "./ConfigHeader";
import { ActionTabProps } from "./types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const splitFormSchema = z.object({
  sourceFileId: z.string().min(1, "Please select a file"),
  sourceColumn: z.string().min(1, "Please select a column"),
  separator: z.string().min(1, "Please enter a separator"),
  outputFormat: z.string().min(1, "Please enter an output format"),
  newColumnName: z.string().min(1, "Please enter a column name"),
  paddingType: z.enum(["none", "zeroPad", "leftPad", "rightPad"]),
  applyToAll: z.boolean().default(false)
});

const mergeFormSchema = z.object({
  sourceFileId: z.string().min(1, "Please select a file"),
  columns: z.array(z.string()).min(1, "Select at least one column"),
  separator: z.string().default("_"),
  newColumnName: z.string().min(1, "Please enter a column name"),
  keepOriginalColumns: z.boolean().default(true)
});

type SplitFormValues = z.infer<typeof splitFormSchema>;
type MergeFormValues = z.infer<typeof mergeFormSchema>;

const ColumnFormatterTab: React.FC<ActionTabProps> = ({ 
  files,
  selectedFiles,
  isProcessing, 
  onComplete 
}) => {
  const [activeTab, setActiveTab] = useState<"split" | "merge">("split");
  const [currentSample, setCurrentSample] = useState<string | null>(null);
  const [paddingConfig, setPaddingConfig] = useState<Array<{
    index: number;
    enabled: boolean;
    length: number;
    padChar: string;
  }>>([]);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [formatParts, setFormatParts] = useState<string[]>([]);
  const [mergePreview, setMergePreview] = useState<string | null>(null);
  const [openPaddingSection, setOpenPaddingSection] = useState(true);

  const splitForm = useForm<SplitFormValues>({
    resolver: zodResolver(splitFormSchema),
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

  const mergeForm = useForm<MergeFormValues>({
    resolver: zodResolver(mergeFormSchema),
    defaultValues: {
      sourceFileId: "",
      columns: [],
      separator: "_",
      newColumnName: "merged_column",
      keepOriginalColumns: true
    }
  });

  const sourceFileId = splitForm.watch("sourceFileId");
  const sourceColumn = splitForm.watch("sourceColumn");
  const separator = splitForm.watch("separator");
  const outputFormat = splitForm.watch("outputFormat");
  const paddingType = splitForm.watch("paddingType");
  
  const mergeSourceFileId = mergeForm.watch("sourceFileId");
  const mergeColumns = mergeForm.watch("columns");
  const mergeSeparator = mergeForm.watch("separator");

  useEffect(() => {
    const savedTab = localStorage.getItem('column-formatter-tab');
    if (savedTab && (savedTab === 'split' || savedTab === 'merge')) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('column-formatter-tab', activeTab);
    
    if (activeTab === "split") {
      splitForm.setValue("outputFormat", "{0}_{1}_{2}");
    } else {
      mergeForm.setValue("columns", []);
      mergeForm.setValue("newColumnName", "merged_column");
    }
    setPreviewResult(null);
    setCurrentSample(null);
    setMergePreview(null);
  }, [activeTab, splitForm, mergeForm]);

  useEffect(() => {
    if (sourceFileId) {
      splitForm.setValue("sourceColumn", "");
      splitForm.setValue("newColumnName", "");
      setCurrentSample(null);
      setPreviewResult(null);
      setPaddingConfig([]);
      setFormatParts([]);
    }
  }, [sourceFileId, splitForm]);

  useEffect(() => {
    if (sourceFileId && sourceColumn) {
      const sourceFile = files.find(f => f.id === sourceFileId);
      if (sourceFile?.data && sourceFile.data.length > 0) {
        const sampleValue = sourceFile.data.find(row => 
          row[sourceColumn] && String(row[sourceColumn]).trim() !== ""
        )?.[sourceColumn];
        
        if (sampleValue) {
          setCurrentSample(String(sampleValue));
          
          if (activeTab === "split" && separator) {
            const parts = String(sampleValue).split(separator);
            setFormatParts(parts);
            
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
      
      if (activeTab === "split") {
        splitForm.setValue("newColumnName", `${sourceColumn}_formatted`);
      }
    }
  }, [sourceFileId, sourceColumn, activeTab, separator, splitForm, files]);

  useEffect(() => {
    if (activeTab === "merge" && mergeSourceFileId && mergeColumns.length > 0) {
      const sourceFile = files.find(f => f.id === mergeSourceFileId);
      if (sourceFile?.data && sourceFile.data.length > 0) {
        const sampleRow = sourceFile.data.find(row => 
          mergeColumns.every(col => row[col] && String(row[col]).trim() !== "")
        );
        
        if (sampleRow) {
          const preview = mergeColumns.map(col => String(sampleRow[col])).join(mergeSeparator);
          setMergePreview(preview);
          const columnNames = mergeColumns.join('_').substring(0, 15);
          mergeForm.setValue("newColumnName", `merged_${columnNames}`);
        } else {
          setMergePreview(null);
        }
      }
    }
  }, [mergeSourceFileId, mergeColumns, mergeSeparator, mergeForm, files, activeTab]);

  const getSplitColumns = () => {
    const sourceFile = files.find(f => f.id === sourceFileId);
    return sourceFile?.columns || [];
  };
  
  const getMergeColumns = () => {
    const sourceFile = files.find(f => f.id === mergeSourceFileId);
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
      if (activeTab === "split") {
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
        
        let result = outputFormat;
        processedParts.forEach((part, idx) => {
          result = result.replace(`{${idx}}`, part);
        });
        
        setPreviewResult(result);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Error generating preview");
    }
  };

  const toggleColumnSelection = (column: string) => {
    const currentColumns = mergeForm.getValues("columns");
    if (currentColumns.includes(column)) {
      mergeForm.setValue("columns", currentColumns.filter(c => c !== column));
    } else {
      mergeForm.setValue("columns", [...currentColumns, column]);
    }
  };

  const handleSplitSubmit = (values: SplitFormValues) => {
    if (isProcessing) return;
    
    try {
      const sourceFile = files.find(f => f.id === values.sourceFileId);
      if (!sourceFile || !sourceFile.data || sourceFile.data.length === 0) {
        toast.error("Source file data not found");
        return;
      }

      const processedData = sourceFile.data.map(row => {
        const newRow = { ...row };
        const sourceValue = String(row[values.sourceColumn] || "");
        
        if (sourceValue) {
          const parts = sourceValue.split(values.separator);
          
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
          
          let formattedValue = values.outputFormat;
          processedParts.forEach((part, idx) => {
            formattedValue = formattedValue.replace(`{${idx}}`, part);
          });
          
          newRow[values.newColumnName] = formattedValue;
          
          if (values.applyToAll) {
            newRow[values.sourceColumn] = formattedValue;
          }
        }
        
        return newRow;
      });

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

  const handleMergeSubmit = (values: MergeFormValues) => {
    if (isProcessing) return;
    
    try {
      const sourceFile = files.find(f => f.id === values.sourceFileId);
      if (!sourceFile || !sourceFile.data || sourceFile.data.length === 0) {
        toast.error("Source file data not found");
        return;
      }

      const processedData = sourceFile.data.map(row => {
        const newRow = { ...row };
        
        const mergedValue = values.columns
          .map(col => String(row[col] || ""))
          .join(values.separator);
        
        newRow[values.newColumnName] = mergedValue;
        
        if (!values.keepOriginalColumns) {
          values.columns.forEach(col => {
            delete newRow[col];
          });
        }
        
        return newRow;
      });

      let updatedColumns = [...sourceFile.columns];
      if (!values.keepOriginalColumns) {
        updatedColumns = updatedColumns.filter(col => !values.columns.includes(col));
      }
      updatedColumns.push(values.newColumnName);

      const updatedFile = {
        ...sourceFile,
        data: processedData,
        columns: updatedColumns,
        content: generateCSV(processedData),
        size: new Blob([generateCSV(processedData)]).size
      };

      const updatedFiles = files.map(file => 
        file.id === values.sourceFileId ? updatedFile : file
      );
      
      onComplete(processedData, updatedFiles);
      toast.success(`Successfully merged columns into "${values.newColumnName}"`);
    } catch (error) {
      console.error("Error merging columns:", error);
      toast.error("Failed to merge columns");
    }
  };

  return (
    <div className="space-y-4">
      <ConfigHeader 
        title="Column Formatter" 
        description="Split column values by a separator, apply custom formatting, or merge multiple columns together."
        icon={<SplitSquareHorizontal className="h-4 w-4" />}
      />
      
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "split" | "merge")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full bg-gradient-to-r from-blue-100/70 to-purple-100/70 dark:from-blue-900/40 dark:to-purple-900/40 rounded-xl p-1">
          <TabsTrigger 
            value="split" 
            className="flex gap-1.5 items-center rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all"
          >
            <SplitSquareHorizontal className="h-3.5 w-3.5" />
            Split & Format
          </TabsTrigger>
          <TabsTrigger 
            value="merge" 
            className="flex gap-1.5 items-center rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white transition-all"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Merge Columns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="split" className="mt-4 animate-fade-in">
          <Form {...splitForm}>
            <form onSubmit={splitForm.handleSubmit(handleSplitSubmit)} className="space-y-4">
              <Card gradient className="overflow-hidden border-[#e2e8f0] shadow-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b">
                  <CardTitle className="text-lg flex items-center">
                    <SplitSquareHorizontal className="h-5 w-5 mr-2 text-blue-500" />
                    Split Column Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={splitForm.control}
                      name="sourceFileId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <FilePlus2 className="h-3.5 w-3.5" /> Select File
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20">
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
                      control={splitForm.control}
                      name="sourceColumn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <ArrowRight className="h-3.5 w-3.5" /> Select Column
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!sourceFileId}
                          >
                            <FormControl>
                              <SelectTrigger className="border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20">
                                <SelectValue placeholder="Choose a column" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getSplitColumns().map(column => (
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={splitForm.control}
                      name="separator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">Separator</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. _" className="input-highlight" />
                          </FormControl>
                          <FormDescription>
                            Character used to split the column (e.g. "_")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={splitForm.control}
                      name="newColumnName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">New Column Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter new column name" className="input-highlight" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {currentSample && (
                    <div className="mt-5">
                      <div className="section-highlight mb-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <Badge variant="info" className="mr-2">Sample</Badge> 
                          Current Value
                        </h4>
                        <div className="p-2 bg-muted/70 rounded-md text-sm font-mono">
                          {currentSample}
                        </div>
                        
                        {formatParts.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">After splitting by "{separator}":</p>
                            <div className="flex flex-wrap gap-2">
                              {formatParts.map((part, idx) => (
                                <Badge key={idx} variant={["primary", "info", "purple", "teal", "pink", "warning"][idx % 6] as any} className="py-1 px-2">
                                  <span className="text-xs mr-1 opacity-70">Part {idx}:</span> 
                                  <span className="font-mono">{part}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Collapsible
                        open={openPaddingSection}
                        onOpenChange={setOpenPaddingSection}
                        className="card-colorful p-4 rounded-lg mb-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium mb-2 flex items-center">
                            <Badge variant="purple" className="mr-2">Formatting</Badge>
                            Padding Configuration
                          </h4>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {openPaddingSection ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        
                        <CollapsibleContent className="mt-2 space-y-4 animate-slide-in">
                          <FormField
                            control={splitForm.control}
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
                                      <SelectTrigger className="w-[180px] input-highlight">
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
                          
                          {paddingType !== "none" && (
                            <div className="space-y-3">
                              {paddingConfig.map((config, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 border rounded-md bg-background hover:shadow-sm transition-shadow">
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
                                      className="w-20 input-highlight"
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
                                      className="w-14 input-highlight"
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
                        </CollapsibleContent>
                      </Collapsible>
                      
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <FormField
                          control={splitForm.control}
                          name="outputFormat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1">
                                <Badge variant="pink" className="mr-1">Template</Badge>
                                Output Format
                              </FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. {0}_{1}_{2}" className="input-highlight" />
                              </FormControl>
                              <FormDescription>
                                Use {`{0}`}, {`{1}`}, etc. as placeholders for each part
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="mt-4 flex items-center gap-4">
                          <Button 
                            type="button" 
                            variant="outline"
                            className="btn-colorful-alt"
                            onClick={handlePreviewFormat}
                          >
                            Preview Format
                          </Button>
                          
                          {previewResult && (
                            <div className="flex-1">
                              <h4 className="text-sm font-medium mb-1">Preview Result:</h4>
                              <div className="p-2 bg-muted rounded-md text-sm font-mono">
                                {previewResult}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <FormField
                      control={splitForm.control}
                      name="applyToAll"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-md">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500"
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
                  className="hover:scale-105 transition-transform bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
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
        </TabsContent>

        <TabsContent value="merge" className="mt-4 animate-fade-in">
          <Form {...mergeForm}>
            <form onSubmit={mergeForm.handleSubmit(handleMergeSubmit)} className="space-y-4">
              <Card gradient className="overflow-hidden border-[#e2e8f0] shadow-md">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-b">
                  <CardTitle className="text-lg flex items-center">
                    <ArrowRightLeft className="h-5 w-5 mr-2 text-teal-500" />
                    Merge Columns Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={mergeForm.control}
                      name="sourceFileId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                            <FilePlus2 className="h-3.5 w-3.5" /> Select File
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20">
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
                      control={mergeForm.control}
                      name="separator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                            Join With:
                          </FormLabel>
                          <div className="grid grid-cols-5 gap-2">
                            <Button 
                              type="button" 
                              variant={field.value === "_" ? "default" : "outline"}
                              size="sm"
                              onClick={() => mergeForm.setValue("separator", "_")}
                              className={cn(
                                field.value === "_" ? "bg-gradient-to-r from-teal-500 to-emerald-500" : "",
                                "flex-1"
                              )}
                            >
                              Underscore
                            </Button>
                            <Button 
                              type="button" 
                              variant={field.value === "-" ? "default" : "outline"}
                              size="sm"
                              onClick={() => mergeForm.setValue("separator", "-")}
                              className={cn(
                                field.value === "-" ? "bg-gradient-to-r from-teal-500 to-emerald-500" : "",
                                "flex-1"
                              )}
                            >
                              Hyphen
                            </Button>
                            <Button 
                              type="button" 
                              variant={field.value === " " ? "default" : "outline"}
                              size="sm"
                              onClick={() => mergeForm.setValue("separator", " ")}
                              className={cn(
                                field.value === " " ? "bg-gradient-to-r from-teal-500 to-emerald-500" : "",
                                "flex-1"
                              )}
                            >
                              Space
                            </Button>
                            <Button 
                              type="button" 
                              variant={field.value === "," ? "default" : "outline"}
                              size="sm"
                              onClick={() => mergeForm.setValue("separator", ",")}
                              className={cn(
                                field.value === "," ? "bg-gradient-to-r from-teal-500 to-emerald-500" : "",
                                "flex-1"
                              )}
                            >
                              Comma
                            </Button>
                            <div>
                              <Input 
                                placeholder="Custom" 
                                value={!["_", "-", " ", ","].includes(field.value) ? field.value : ""} 
                                onChange={(e) => mergeForm.setValue("separator", e.target.value)}
                                className="h-9 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                              />
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={mergeForm.control}
                    name="columns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                          Select Columns to Merge
                          {field.value.length > 0 && (
                            <Badge variant="teal" className="ml-2">
                              {field.value.length} selected
                            </Badge>
                          )}
                        </FormLabel>
                        
                        <div className="bg-teal-50/50 dark:bg-teal-900/20 rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto mt-2 border border-teal-100">
                          {mergeSourceFileId ? (
                            <div className="grid grid-cols-2 gap-2">
                              {getMergeColumns().map(column => (
                                <div 
                                  key={column} 
                                  className={cn(
                                    "flex items-center p-2 rounded-md cursor-pointer transition-colors",
                                    mergeColumns.includes(column) 
                                      ? "bg-gradient-to-r from-teal-100 to-emerald-100 dark:from-teal-800/40 dark:to-emerald-800/40 text-teal-900 dark:text-teal-100 border border-teal-300" 
                                      : "hover:bg-teal-50 dark:hover:bg-teal-800/20 border border-transparent"
                                  )}
                                  onClick={() => toggleColumnSelection(column)}
                                >
                                  <div className="h-4 w-4 mr-2 flex items-center justify-center text-teal-500">
                                    {mergeColumns.includes(column) && <Check className="h-3 w-3" />}
                                  </div>
                                  <span className="text-sm truncate">{column}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-sm text-muted-foreground h-full">
                              Select a file first to see available columns
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={mergeForm.control}
                      name="newColumnName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1 text-teal-600 dark:text-teal-400">New Column Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter name for merged column" 
                              className="border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={mergeForm.control}
                      name="keepOriginalColumns"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 bg-teal-50/50 dark:bg-teal-900/20 p-3 rounded-md h-full">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-emerald-500"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Keep original columns</FormLabel>
                            <FormDescription>
                              If turned off, the original columns will be removed after merging
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {mergePreview && (
                    <div className="mt-4 bg-teal-50/40 dark:bg-teal-900/10 p-4 rounded-lg border border-teal-100">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <Badge variant="teal" className="mr-2">
                          Preview
                        </Badge>
                        Merged Result
                      </h4>
                      <div className="p-2 bg-white dark:bg-black/20 rounded-md text-sm font-mono border border-teal-100">
                        {mergePreview}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex justify-center mt-6">
                <Button
                  type="submit"
                  disabled={!mergeSourceFileId || mergeColumns.length < 1 || isProcessing}
                  className="hover:scale-105 transition-transform bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
                >
                  {isProcessing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Merge Columns
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ColumnFormatterTab;
