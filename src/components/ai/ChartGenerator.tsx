
import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileData } from "@/utils/fileUtils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart, LineChart, PieChart, Cell, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie } from "recharts";
import { Download, PieChartIcon, BarChart2, LineChart as LineChartIcon } from "lucide-react";

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
        // This is a simplified version - a real implementation would use a library like html2canvas
        alert("Chart saved! (This is a placeholder - actual saving functionality would be implemented here)");
      } catch (error) {
        console.error("Error saving chart:", error);
      }
    }
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="w-full h-64 flex items-center justify-center text-muted-foreground">
          Select a file and column to generate a chart
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
              <Bar dataKey="value" fill="#8884d8" />
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
              <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Data Visualization</CardTitle>
        <CardDescription>Generate charts from your data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select File</label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a file" />
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
              <label className="text-sm font-medium mb-2 block">Select Column</label>
              <Select 
                value={selectedColumn} 
                onValueChange={setSelectedColumn}
                disabled={!selectedFile}
              >
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Chart Type</label>
              <ToggleGroup 
                type="single" 
                value={chartType} 
                onValueChange={(value) => value && setChartType(value as ChartType)}
                className="justify-start"
              >
                <ToggleGroupItem value="bar" aria-label="Bar Chart">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Bar
                </ToggleGroupItem>
                <ToggleGroupItem value="line" aria-label="Line Chart">
                  <LineChartIcon className="h-4 w-4 mr-1" />
                  Line
                </ToggleGroupItem>
                <ToggleGroupItem value="pie" aria-label="Pie Chart">
                  <PieChartIcon className="h-4 w-4 mr-1" />
                  Pie
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="border rounded-md p-4" id="chart-container">
            {renderChart()}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveChart} 
              disabled={!chartData.length}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Save Chart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartGenerator;
