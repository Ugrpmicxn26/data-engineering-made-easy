
import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface PythonEditorProps {
  pythonCode: string;
  setPythonCode: (code: string) => void;
}

const PythonEditor: React.FC<PythonEditorProps> = ({ pythonCode, setPythonCode }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-muted p-2 text-sm font-medium">Python Code</div>
      <Textarea
        value={pythonCode}
        onChange={(e) => setPythonCode(e.target.value)}
        className="flex-1 font-mono text-sm p-4 border-0 resize-none focus-visible:ring-0 rounded-none"
        placeholder="Write your Python code here..."
      />
    </div>
  );
};

export default PythonEditor;
