
import React, { useState } from "react";
import { FileData } from "@/utils/fileUtils";
import FileDropZone from "@/components/FileDropZone";
import FileList from "@/components/FileList";
import MergeConfigurator from "@/components/MergeConfigurator";
import DataTable from "@/components/DataTable";
import FilePreviewModal from "@/components/FilePreviewModal";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadIcon, Settings, Layers, PanelRight } from "lucide-react";

const Index = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [mergedData, setMergedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Handle files being processed
  const handleFilesProcessed = (newFiles: FileData[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0) {
      setActiveTab("files");
    }
  };

  // Toggle file selection
  const handleToggleSelect = (fileId: string) => {
    setFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, selected: !file.selected } : file
      )
    );
  };

  // Preview a file
  const handlePreview = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setPreviewFile(file);
      setIsPreviewOpen(true);
    }
  };

  // Remove a file
  const handleRemove = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    toast.success("File removed");
  };

  // Handle merge complete
  const handleMergeComplete = (data: any[]) => {
    setMergedData(data);
    setActiveTab("results");
    toast.success(`Successfully merged ${data.length} rows`);
  };

  // Count selected files
  const selectedFilesCount = files.filter(file => file.selected).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto py-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Zip Merge Master
                </span>
              </h1>
              <p className="text-muted-foreground text-sm">Transform and merge your CSV data seamlessly</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="upload" className="flex gap-1 items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <UploadIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Upload</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="flex gap-1 items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={files.length === 0}>
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Configure</span>
                  {files.length > 0 && <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-full px-1.5">{files.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="results" className="flex gap-1 items-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={mergedData.length === 0}>
                  <PanelRight className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Results</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-8 px-4 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="upload" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <span className="inline-block rounded-full bg-primary/10 p-2 mb-3">
                  <UploadIcon className="h-6 w-6 text-primary" />
                </span>
                <h2 className="text-2xl font-medium mb-2">Upload Your Data</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload ZIP or CSV files to start transforming and merging your data
                </p>
              </div>
              
              <FileDropZone onFilesProcessed={handleFilesProcessed} />
              
              {files.length > 0 && (
                <div className="mt-8">
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
          
          <TabsContent value="files" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center mb-8">
                <span className="inline-block rounded-full bg-primary/10 p-2 mb-3">
                  <Settings className="h-6 w-6 text-primary" />
                </span>
                <h2 className="text-2xl font-medium mb-2">Configure and Merge</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select files and configure how you want to merge them
                </p>
              </div>
              
              <FileList
                files={files}
                onToggleSelect={handleToggleSelect}
                onPreview={handlePreview}
                onRemove={handleRemove}
              />
              
              <div className="pt-4">
                <MergeConfigurator files={files} onMergeComplete={handleMergeComplete} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <span className="inline-block rounded-full bg-primary/10 p-2 mb-3">
                  <PanelRight className="h-6 w-6 text-primary" />
                </span>
                <h2 className="text-2xl font-medium mb-2">Merged Results</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  View and download your merged data
                </p>
              </div>
              
              <DataTable data={mergedData} filename="merged-data.csv" />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p>Zip Merge Master — A data transformation tool</p>
          <p className="mt-1">All data processing happens in your browser for privacy</p>
        </div>
      </footer>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default Index;
