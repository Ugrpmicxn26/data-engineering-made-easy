
import React from "react";

interface PythonOutputProps {
  pythonOutput: string;
  error: string | null;
}

const PythonOutput: React.FC<PythonOutputProps> = ({ pythonOutput, error }) => {
  return (
    <div className="h-full overflow-auto bg-slate-950 p-4">
      <pre className="text-xs font-mono whitespace-pre-wrap text-slate-200">
        {error ? (
          <div className="text-red-400">{error}</div>
        ) : pythonOutput ? (
          pythonOutput
        ) : (
          "# Run the code to see output here"
        )}
      </pre>
    </div>
  );
};

export default PythonOutput;
