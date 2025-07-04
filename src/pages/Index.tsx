import React, { useState, useEffect } from "react";
import { FileData } from "@/utils/fileUtils";
import { dataStorage } from "@/utils/dataStorage";
import FileDropZone from "@/components/FileDropZone";
import FileList from "@/components/FileList";
import MergeConfigurator from "@/components/MergeConfigurator";
import DataTable from "@/components/DataTable";
import FilePreviewModal from "@/components/FilePreviewModal";
import CodeTransformer from "@/components/CodeTransformer";
import ColumnTypeChanger from "@/components/ColumnTypeChanger";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UploadIcon, Settings, PanelRight, SlidersHorizontal, PlusCircle, Code2, Type, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/auth/UserMenu";
import { sessionStore } from "@/utils/sessionStore";
import { Link } from "react-router-dom";

const Index = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [mergedData, setMergedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    const savedTab = localStorage.getItem('zip-merge-active-tab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
    
    const savedFiles = sessionStore.getStore('files');
    if (savedFiles && savedFiles.length > 0) {
      setFiles(savedFiles);
    }
    
    const savedMergedData = sessionStore.getStore('mergedData');
    if (savedMergedData && savedMergedData.length > 0) {
      setMergedData(savedMergedData);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('zip-merge-active-tab', activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    if (files.length > 0) {
      sessionStore.createStore('files', files);
    }
  }, [files]);
  
  useEffect(() => {
    if (mergedData.length > 0) {
      sessionStore.createStore('mergedData', mergedData);
    }
  }, [mergedData]);

  const handleFilesProcessed = (newFiles: FileData[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0) {
      setActiveTab("files");
      setShowUploader(false);
    }
  };

  const handleToggleSelect = (fileId: string) => {
    setFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, selected: !file.selected } : file
      )
    );
  };

  const handlePreview = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setPreviewFile(file);
      setIsPreviewOpen(true);
    }
  };

  const handleRemove = async (fileId: string) => {
    try {
      // Remove from database
      await dataStorage.cleanup();
      // Remove from state
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success("File removed");
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error("Failed to remove file");
    }
  };

  const handleMergeComplete = (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => {
    setMergedData(data);
    
    if (updatedFiles) {
      setFiles(updatedFiles);
      
      if (saveAsMergedFile) {
        const mergedFile = updatedFiles.find(f => f.id.startsWith('merged-'));
        if (mergedFile) {
          toast.success(`Merged file "${mergedFile.name}" saved and available for further operations`);
        }
      }
    }
    
    setActiveTab("results");
    
    if (!saveAsMergedFile) {
      toast.success(`Successfully processed ${data.length} rows`);
    }
  };

  const toggleUploader = () => {
    setShowUploader(prev => !prev);
  };

  const handleTransformComplete = (data: any[], sourceFileId: string) => {
    const sourceFile = files.find(f => f.id === sourceFileId);
    let newFileName = "transformed-data.csv";
    if (sourceFile) {
      const baseName = sourceFile.name.replace(/\.[^/.]+$/, "");
      newFileName = `${baseName}-transformed.csv`;
    }
    
    const newFileId = `transformed-${Date.now()}`;
    const newFile: FileData = {
      id: newFileId,
      name: newFileName,
      type: "csv",
      size: 0,
      data: data,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      selected: true,
      content: '',
    };
    
    setFiles(prev => [...prev, newFile]);
    setMergedData(data);
    toast.success(`Transformation complete. Created new file: ${newFileName}`);
    setActiveTab("files");
  };

  const handleResultDataUpdate = (updatedData: any[]) => {
    setMergedData(updatedData);
  };

  const selectedFilesCount = files.filter(file => file.selected).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto py-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  Zip Merge Master
                </span>
              </h1>
              <p className="text-muted-foreground text-sm">Transform and merge your CSV data seamlessly</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/ai">
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-blue-50 hover:text-blue-600 mr-2"
                >
                  <Bot className="h-3.5 w-3.5 mr-1" />
                  <span>AI Assistant</span>
                </Button>
              </Link>
              
              <UserMenu />
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-3 w-full sm:w-auto gradient-tabs">
                  <TabsTrigger value="upload" className="flex gap-1 items-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
                    <UploadIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Upload</span>
                  </TabsTrigger>
                  <TabsTrigger value="files" className="flex gap-1 items-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white" disabled={files.length === 0}>
                    <Settings className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Configure</span>
                    {files.length > 0 && <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-full px-1.5">{files.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="results" className="flex gap-1 items-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white" disabled={mergedData.length === 0}>
                    <PanelRight className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Results</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {files.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleUploader}
                  className={cn(
                    "transition-all duration-300",
                    showUploader 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "hover:bg-blue-50 hover:text-blue-600"
                  )}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Add Files</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsContent value="upload" className="mt-0 focus-visible:outline-none focus-visible:ring-0 h-full animate-fade-in">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <span className="inline-block rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-2 mb-3">
                  <UploadIcon className="h-6 w-6 text-blue-500" />
                </span>
                <h2 className="text-2xl font-medium mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Upload Your Data</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload ZIP or CSV files to start transforming and merging your data
                </p>
              </div>
              
              <FileDropZone onFilesProcessed={handleFilesProcessed} />
              
              {files.length > 0 && (
                <div className="mt-8 animate-fade-in">
                  <FileList
                    files={files}
                    onToggleSelect={handleToggleSelect}
                    onPreview={handlePreview}
                    onRemove={handleRemove}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="files" className="mt-0 focus-visible:outline-none focus-visible:ring-0 h-full animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-8">
              {showUploader && (
                <div className="animate-fade-in border rounded-lg p-6 mb-6 glass-card">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium">Add More Files</h3>
                    <p className="text-sm text-muted-foreground">Upload additional files to process</p>
                  </div>
                  <FileDropZone onFilesProcessed={handleFilesProcessed} />
                </div>
              )}
              
              <div className="text-center mb-8">
                <span className="inline-block rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-2 mb-3">
                  <Settings className="h-6 w-6 text-blue-500" />
                </span>
                <h2 className="text-2xl font-medium mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Configure and Transform</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select files and choose transformation operations: merge, pivot, drop columns, or filter rows
                </p>
              </div>
              
              <FileList
                files={files}
                onToggleSelect={handleToggleSelect}
                onPreview={handlePreview}
                onRemove={handleRemove}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <CodeTransformer 
                  files={files} 
                  onTransformComplete={handleTransformComplete}
                />
                
                <ColumnTypeChanger 
                  files={files} 
                  onTypeChangeComplete={handleTransformComplete}
                />
              </div>
              
              <div className="pt-4">
                <MergeConfigurator files={files} onMergeComplete={handleMergeComplete} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="mt-0 focus-visible:outline-none focus-visible:ring-0 h-full animate-fade-in">
            <div className="max-w-6xl mx-auto space-y-6">
              {showUploader && (
                <div className="animate-fade-in border rounded-lg p-6 mb-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium">Add More Files</h3>
                    <p className="text-sm text-muted-foreground">Upload additional files to process</p>
                  </div>
                  <FileDropZone onFilesProcessed={handleFilesProcessed} />
                </div>
              )}
              
              <div className="text-center mb-8">
                <span className="inline-block rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-2 mb-3">
                  <SlidersHorizontal className="h-6 w-6 text-blue-500" />
                </span>
                <h2 className="text-2xl font-medium mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Analyze and Transform</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Explore your merged data with powerful tools for filtering, pivoting, and more
                </p>
              </div>
              
              <DataTable 
                data={mergedData} 
                filename="merged-data.csv" 
                onDataUpdate={handleResultDataUpdate}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-6 mt-auto bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p>Zip Merge Master — A data transformation tool</p>
          <p className="mt-1">All data processing happens in your browser for privacy</p>
        </div>
      </footer>

      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default Index;
