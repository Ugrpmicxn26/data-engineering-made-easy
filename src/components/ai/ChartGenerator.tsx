
import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileData } from "@/utils/fileUtils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart, LineChart, PieChart, Cell, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie } from "recharts";
import { Download, PieChartIcon, BarChart2, LineChart as LineChartIcon, Save, ChevronDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ChartGeneratorProps {
  files: FileData[];
}

type ChartType = "bar" | "line" | "pie";

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", 
  "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"
];

const ChartGenerator: React.FC<ChartGeneratorProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [isSaving, setIsSaving] = useState(false);

  const fileOptions = useMemo(() => {
    return files.filter(file => file.data && file.data.length > 0);
  }, [files]);

  const currentFile = useMemo(() => {
    return fileOptions.find(file => file.id === selectedFile);
  }, [fileOptions, selectedFile]);

  const columnOptions = useMemo(() => {
    if (!currentFile || !currentFile.columns) return [];
    return currentFile.columns;
  }, [currentFile]);

  const chartData = useMemo(() => {
    if (!currentFile || !selectedColumn) return [];
    
    // Count occurrences of each value in the selected column
    const valueFrequency: Record<string, number> = {};
    
    currentFile.data.forEach(row => {
      const value = row[selectedColumn]?.toString() || "N/A";
      valueFrequency[value] = (valueFrequency[value] || 0) + 1;
    });
    
    // Convert to chart-compatible format
    return Object.entries(valueFrequency).map(([name, value]) => ({
      name,
      value
    }));
  }, [currentFile, selectedColumn]);

  const handleSaveChart = () => {
    const chartContainer = document.getElementById("chart-container");
    if (chartContainer) {
      try {
        setIsSaving(true);
        // Simulate saving process
        setTimeout(() => {
          setIsSaving(false);
          toast.success(`Chart saved as ${currentFile?.name.replace(/\.[^/.]+$/, "")}_${selectedColumn}_${chartType}_chart.png`);
        }, 1500);
      } catch (error) {
        console.error("Error saving chart:", error);
        setIsSaving(false);
        toast.error("Failed to save chart");
      }
    }
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <PieChartIcon className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-center">Select a file and column to generate a chart</p>
        </div>
      );
    }

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full shadow-md border-slate-200 dark:border-slate-800">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
        <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Data Visualization</CardTitle>
        <CardDescription>Generate insightful charts from your data</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Select File</label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a data file" />
                </SelectTrigger>
                <SelectContent>
                  {fileOptions.map(file => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Select Column</label>
              <Select 
                value={selectedColumn} 
                onValueChange={setSelectedColumn}
                disabled={!selectedFile}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columnOptions.map(column => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Chart Type</label>
              <ToggleGroup 
                type="single" 
                value={chartType} 
                onValueChange={(value) => value && setChartType(value as ChartType)}
                className="justify-start border rounded-md p-1 gap-1"
              >
                <ToggleGroupItem value="bar" aria-label="Bar Chart" className="data-[state=on]:bg-blue-500 data-[state=on]:text-white">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Bar
                </ToggleGroupItem>
                <ToggleGroupItem value="line" aria-label="Line Chart" className="data-[state=on]:bg-indigo-500 data-[state=on]:text-white">
                  <LineChartIcon className="h-4 w-4 mr-1" />
                  Line
                </ToggleGroupItem>
                <ToggleGroupItem value="pie" aria-label="Pie Chart" className="data-[state=on]:bg-purple-500 data-[state=on]:text-white">
                  <PieChartIcon className="h-4 w-4 mr-1" />
                  Pie
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-white dark:bg-slate-950 shadow-sm" id="chart-container">
            {renderChart()}
          </div>

          <div className="flex justify-end gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={!chartData.length}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => toast.success("Chart exported as CSV")}>
                    Export as CSV
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => toast.success("Chart exported as Excel")}>
                    Export as Excel
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => toast.success("Chart data exported as JSON")}>
                    Export as JSON
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button 
              onClick={handleSaveChart} 
              disabled={!chartData.length || isSaving}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Chart
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartGenerator;
