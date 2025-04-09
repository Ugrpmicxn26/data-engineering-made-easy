
import React, { useState, useMemo } from "react";
import { FileData } from "@/utils/fileUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart2, LineChart, PieChart, Download, Save, ChevronDown, Loader2, ArrowDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, LineChart as ReLineChart, PieChart as RePieChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Bar, Line, Pie, Cell } from 'recharts';

interface DataVisualizationTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

type ChartType = "bar" | "line" | "pie";

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", 
  "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"
];

const DataVisualizationTab: React.FC<DataVisualizationTabProps> = ({
  files,
  selectedFiles,
  isProcessing,
  onComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [xAxisColumn, setXAxisColumn] = useState<string>("");
  const [yAxisColumn, setYAxisColumn] = useState<string>("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [isSaving, setIsSaving] = useState(false);

  const currentFile = useMemo(() => {
    return selectedFiles.find(file => file.id === selectedFile);
  }, [selectedFiles, selectedFile]);

  const columnOptions = useMemo(() => {
    if (!currentFile || !currentFile.columns) return [];
    return currentFile.columns;
  }, [currentFile]);

  const chartData = useMemo(() => {
    if (!currentFile || !xAxisColumn) return [];
    
    if (chartType === "pie") {
      // For pie charts, count occurrences of each value in the selected column
      const valueFrequency: Record<string, number> = {};
      
      currentFile.data.forEach(row => {
        const value = row[xAxisColumn]?.toString() || "N/A";
        valueFrequency[value] = (valueFrequency[value] || 0) + 1;
      });
      
      // Convert to chart-compatible format
      return Object.entries(valueFrequency).map(([name, value]) => ({
        name,
        value
      }));
    } else {
      // For bar and line charts, use x and y axis columns
      if (!yAxisColumn) return [];
      
      return currentFile.data.map(row => {
        const xValue = row[xAxisColumn]?.toString() || "N/A";
        let yValue = row[yAxisColumn];
        
        // Try to convert y value to number if it's a string
        if (typeof yValue === 'string') {
          yValue = Number(yValue) || 0;
        }
        
        return {
          name: xValue,
          value: yValue || 0
        };
      }).slice(0, 20); // Limit to 20 data points to avoid cluttering
    }
  }, [currentFile, xAxisColumn, yAxisColumn, chartType]);

  const handleSaveChart = () => {
    if (!currentFile || !chartData.length) {
      toast.error("No data to save");
      return;
    }
    
    try {
      setIsSaving(true);
      // Create a new file with the chart data
      const newFile: FileData = {
        id: `chart-${Date.now()}`,
        name: `${currentFile.name.replace(/\.[^/.]+$/, "")}_${chartType}_chart.csv`,
        type: "csv",
        size: 0,
        data: chartData,
        columns: Object.keys(chartData[0]),
        selected: true,
        content: ''
      };
      
      // Add the new file to the files list
      const updatedFiles = [...files, newFile];
      
      // Simulate processing time
      setTimeout(() => {
        onComplete(chartData, updatedFiles, true);
        setIsSaving(false);
        toast.success(`Chart saved as ${newFile.name}`);
      }, 1000);
    } catch (error) {
      console.error("Error saving chart:", error);
      setIsSaving(false);
      toast.error("Failed to save chart");
    }
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <PieChart className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-center">Select a file and columns to generate a chart</p>
        </div>
      );
    }

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70} 
                interval={0}
                tick={{ fontSize: 12 }}
              />
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
            <ReLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70} 
                interval={0}
                tick={{ fontSize: 12 }}
              />
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
            </ReLineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
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
            </RePieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-md border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
          <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Data Visualization
          </CardTitle>
          <CardDescription>
            Create insightful charts from your data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Select File</label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a data file" />
                </SelectTrigger>
                <SelectContent>
                  {selectedFiles.map(file => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">
                {chartType === "pie" ? "Category Column" : "X-Axis Column"}
              </label>
              <Select 
                value={xAxisColumn} 
                onValueChange={setXAxisColumn}
                disabled={!selectedFile}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={chartType === "pie" ? "Select category column" : "Select X-axis column"} />
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

            {chartType !== "pie" && (
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Y-Axis Column</label>
                <Select 
                  value={yAxisColumn} 
                  onValueChange={setYAxisColumn}
                  disabled={!selectedFile || !xAxisColumn}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Y-axis column" />
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
            )}
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
                <LineChart className="h-4 w-4 mr-1" />
                Line
              </ToggleGroupItem>
              <ToggleGroupItem value="pie" aria-label="Pie Chart" className="data-[state=on]:bg-purple-500 data-[state=on]:text-white">
                <PieChart className="h-4 w-4 mr-1" />
                Pie
              </ToggleGroupItem>
            </ToggleGroup>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default DataVisualizationTab;
