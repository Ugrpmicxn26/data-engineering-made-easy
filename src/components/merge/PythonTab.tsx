
import React, { useState, useEffect } from "react";
import { FileData, ParseOptions } from "@/utils/fileUtils";
import { toast } from "sonner";
import { FileCode } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ConfigHeader from "./ConfigHeader";
import PythonControls from "./python/PythonControls";
import PythonEditor from "./python/PythonEditor";
import PythonOutput from "./python/PythonOutput";
import PythonDataPreview from "./python/PythonDataPreview";
import EmptyView from "./python/EmptyView";
import { defaultPythonCode } from "./python/defaultPythonCode";
import { executePythonCode, PythonExecutionResult } from "./python/pythonExecutor";

interface PythonTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

const PythonTab: React.FC<PythonTabProps> = ({ 
  files, 
  selectedFiles, 
  isProcessing, 
  onComplete 
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [pythonCode, setPythonCode] = useState<string>("");
  const [pythonOutput, setPythonOutput] = useState<string>("");
  const [outputData, setOutputData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outputName, setOutputName] = useState<string>("");
  const [parseOptions, setParseOptions] = useState<ParseOptions>({
    separator: ",",
    encoding: "utf-8"
  });

  useEffect(() => {
    if (selectedFiles.length > 0 && !selectedFileId) {
      setSelectedFileId(selectedFiles[0].id);
    }
    
    if (!pythonCode) {
      setPythonCode(defaultPythonCode);
    }
    
    setPythonOutput("");
    setOutputData([]);
    setError(null);
  }, [selectedFileId, selectedFiles]);

  useEffect(() => {
    if (selectedFileId) {
      const file = files.find(f => f.id === selectedFileId);
      if (file && file.data) {
        setOutputData(file.data.slice(0, 100)); // Show only first 100 rows initially
        
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setOutputName(`${baseName}-python.csv`);
        
        // Set appropriate parse options based on file extension
        if (file.name.toLowerCase().endsWith('.txt')) {
          setParseOptions({
            separator: "\t",
            encoding: "unicode_escape"
          });
        } else {
          setParseOptions({
            separator: ",",
            encoding: "utf-8"
          });
        }
      }
    }
  }, [selectedFileId, files]);

  const handleOutputNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutputName(e.target.value);
  };

  const handleParseOptionChange = (option: keyof ParseOptions, value: string) => {
    setParseOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };
  
  const handleExecutePython = () => {
    setLoading(true);
    setError(null);
    setPythonOutput("");
    
    const file = files.find(f => f.id === selectedFileId);
    if (!file || !file.data) {
      setError("File data not found");
      setLoading(false);
      return;
    }
    
    setTimeout(() => {
      try {
        const { outputText, resultData, error } = executePythonCode(pythonCode, file, parseOptions);
        
        if (error) {
          setError(error);
        } else {
          setPythonOutput(outputText);
          setOutputData(resultData);
          toast.success("Python code executed successfully");
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setLoading(false);
        toast.error(`Error executing Python code: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }, 1000);
  };

  const handleSave = () => {
    if (outputData.length > 0 && selectedFileId) {
      const newFile: FileData = {
        id: `python-${Date.now()}`,
        name: outputName,
        type: "csv",
        size: 0,
        data: outputData,
        columns: outputData.length > 0 ? Object.keys(outputData[0]) : [],
        selected: true,
        content: '',
      };
      
      onComplete(outputData, [...files, newFile], false);
      toast.success(`Python transformation saved as ${outputName}`);
    } else {
      toast.error("No data to save");
    }
  };

  if (selectedFiles.length === 0) {
    return <EmptyView />;
  }

  return (
    <div className="space-y-6">
      <ConfigHeader
        title="Python Notebook"
        description="Transform your data using Python libraries like pandas, numpy, and more"
        icon={<FileCode className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-4">
        <PythonControls 
          selectedFiles={selectedFiles}
          selectedFileId={selectedFileId}
          setSelectedFileId={setSelectedFileId}
          outputName={outputName}
          handleOutputNameChange={handleOutputNameChange}
          parseOptions={parseOptions}
          handleParseOptionChange={handleParseOptionChange}
          handleExecutePython={handleExecutePython}
          handleSave={handleSave}
          loading={loading}
          outputData={outputData}
        />

        <ResizablePanelGroup direction="horizontal" className="min-h-[600px] border rounded-lg bg-background">
          <ResizablePanel defaultSize={50} minSize={30}>
            <PythonEditor pythonCode={pythonCode} setPythonCode={setPythonCode} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50}>
            <div className="h-full flex flex-col">
              <div className="bg-muted p-2 text-sm font-medium flex justify-between items-center">
                <span>Output</span>
                {outputData.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>{outputData.length} rows</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col">
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={40} minSize={15}>
                    <PythonOutput pythonOutput={pythonOutput} error={error} />
                  </ResizablePanel>
                  
                  <ResizableHandle withHandle />
                  
                  <ResizablePanel defaultSize={60}>
                    <PythonDataPreview outputData={outputData} />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default PythonTab;
