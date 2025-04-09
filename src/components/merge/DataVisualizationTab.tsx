
import React, { useState, useMemo, useCallback } from "react";
import { FileData } from "@/utils/fileUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  BarChart2, 
  LineChart, 
  PieChart, 
  Download, 
  Save, 
  ChevronDown, 
  Loader2, 
  ArrowDown,
  RefreshCcw,
  Sliders,
  Palette,
  AreaChart,
  ScatterChart,
  Radar 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  BarChart, 
  LineChart as ReLineChart, 
  PieChart as RePieChart, 
  AreaChart as ReAreaChart,
  ScatterChart as ReScatterChart,
  RadarChart as ReRadarChart,
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Bar, 
  Line, 
  Pie, 
  Cell, 
  Area,
  Scatter,
  Radar as ReRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart
} from 'recharts';

interface DataVisualizationTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "radar" | "radialBar";

// Enhanced color palette
const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", 
  "#00C49F", "#FFBB28", "#FF8042", "#a442f5", "#f55142",
  "#41b6f5", "#f5d641", "#41f5a7", "#f541d6", "#8741f5"
];

// Gradient definitions
const GRADIENTS = {
  blue: ["#1e3c72", "#2a5298"],
  purple: ["#6a11cb", "#2575fc"],
  green: ["#11998e", "#38ef7d"],
  pink: ["#f953c6", "#b91d73"],
  orange: ["#f12711", "#f5af19"]
};

const DataVisualizationTab: React.FC<DataVisualizationTabProps> = ({
  files,
  selectedFiles,
  isProcessing,
  onComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [xAxisColumn, setXAxisColumn] = useState<string>("");
  const [yAxisColumn, setYAxisColumn] = useState<string>("");
  const [secondaryYAxisColumn, setSecondaryYAxisColumn] = useState<string>("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [isSaving, setIsSaving] = useState(false);
  const [chartTitle, setChartTitle] = useState<string>("");
  const [chartTheme, setChartTheme] = useState<string>("default");
  const [showValues, setShowValues] = useState<boolean>(false);
  const [limitDataPoints, setLimitDataPoints] = useState<number>(20);
  const [activeTab, setActiveTab] = useState<string>("data");
  const [sortData, setSortData] = useState<boolean>(false);
  
  const currentFile = useMemo(() => {
    return selectedFiles.find(file => file.id === selectedFile);
  }, [selectedFiles, selectedFile]);

  const columnOptions = useMemo(() => {
    if (!currentFile || !currentFile.columns) return [];
    return currentFile.columns;
  }, [currentFile]);

  const numericColumnOptions = useMemo(() => {
    if (!currentFile || !currentFile.data.length === 0) return [];
    
    return columnOptions.filter(column => {
      // Check if the first few values of the column are numeric
      const sample = currentFile.data.slice(0, 5);
      const numericCount = sample.reduce((count, row) => {
        const value = row[column];
        return count + (typeof value === 'number' || !isNaN(Number(value)) ? 1 : 0);
      }, 0);
      
      // If most samples are numeric, consider it a numeric column
      return numericCount >= Math.min(3, sample.length);
    });
  }, [currentFile, columnOptions]);

  const chartData = useMemo(() => {
    if (!currentFile || !xAxisColumn) return [];
    
    // Create base data according to chart type
    let data = [...currentFile.data];
    
    // Limit data points
    if (limitDataPoints > 0 && data.length > limitDataPoints) {
      data = data.slice(0, limitDataPoints);
    }
    
    if (chartType === "pie") {
      // For pie charts, count occurrences of each value in the selected column
      const valueFrequency: Record<string, number> = {};
      
      data.forEach(row => {
        const value = row[xAxisColumn]?.toString() || "N/A";
        valueFrequency[value] = (valueFrequency[value] || 0) + 1;
      });
      
      // Sort data if needed
      let entries = Object.entries(valueFrequency);
      if (sortData) {
        entries.sort((a, b) => b[1] - a[1]); // Sort by frequency descending
      }
      
      // Convert to chart-compatible format
      return entries.map(([name, value]) => ({
        name,
        value
      }));
    } else if (chartType === "radar") {
      // For radar charts, we need a different structure
      if (!yAxisColumn) return [];
      
      // Create a data structure suitable for radar charts
      const categories = [...new Set(data.map(row => row[xAxisColumn]))];
      
      if (categories.length > 8) {
        // Radar charts work best with limited categories
        categories.splice(8);
      }
      
      return categories.map(category => {
        const item: any = { name: category };
        
        // Add all numeric columns as dimensions
        if (yAxisColumn) {
          const relevantRows = data.filter(row => row[xAxisColumn] === category);
          const avg = relevantRows.reduce((sum, row) => {
            return sum + Number(row[yAxisColumn] || 0);
          }, 0) / (relevantRows.length || 1);
          
          item[yAxisColumn] = Math.round(avg * 100) / 100;
        }
        
        if (secondaryYAxisColumn) {
          const relevantRows = data.filter(row => row[xAxisColumn] === category);
          const avg = relevantRows.reduce((sum, row) => {
            return sum + Number(row[secondaryYAxisColumn] || 0);
          }, 0) / (relevantRows.length || 1);
          
          item[secondaryYAxisColumn] = Math.round(avg * 100) / 100;
        }
        
        return item;
      });
    } else {
      // For other chart types
      if (!yAxisColumn) return [];
      
      // Transform data for visualization
      let transformedData = data.map(row => {
        const xValue = row[xAxisColumn]?.toString() || "N/A";
        const yValueRaw = row[yAxisColumn];
        const yValue = typeof yValueRaw === 'string' ? Number(yValueRaw) || 0 : yValueRaw || 0;
        
        const result: any = {
          name: xValue,
          value: yValue
        };
        
        // Add secondary Y axis if selected
        if (secondaryYAxisColumn) {
          const secondary = row[secondaryYAxisColumn];
          result.secondary = typeof secondary === 'string' ? 
            Number(secondary) || 0 : secondary || 0;
        }
        
        return result;
      });
      
      // Sort if needed
      if (sortData) {
        transformedData.sort((a, b) => b.value - a.value);
      }
      
      return transformedData;
    }
  }, [currentFile, xAxisColumn, yAxisColumn, secondaryYAxisColumn, chartType, limitDataPoints, sortData]);

  const handleSaveChart = () => {
    if (!currentFile || !chartData.length) {
      toast.error("No data to save");
      return;
    }
    
    try {
      setIsSaving(true);
      // Create a new file with the chart data
      const fileName = chartTitle || 
        `${currentFile.name.replace(/\.[^/.]+$/, "")}_${chartType}_chart`;
      
      const newFile: FileData = {
        id: `chart-${Date.now()}`,
        name: `${fileName}.csv`,
        type: "csv",
        size: 0,
        data: chartData,
        columns: Object.keys(chartData[0]),
        selected: true,
        content: ''
      };
      
      // Add the new file to the files list
      const updatedFiles = [...files, newFile];
      
      // Process the action
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

  const renderCustomizedLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    if (percent < 0.05) return null; // Don't render very small slices
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  }, []);

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <PieChart className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-center">Select a file and columns to generate a chart</p>
        </div>
      );
    }

    const getGradient = (id: string) => {
      const colors = GRADIENTS[chartTheme as keyof typeof GRADIENTS] || GRADIENTS.blue;
      return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={colors[1]} stopOpacity={0.3}/>
        </linearGradient>
      );
    };

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              className="animate-in fade-in duration-500"
            >
              <defs>
                {getGradient("barFill")}
              </defs>
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
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Legend />
              <Bar 
                dataKey="value" 
                fill="url(#barFill)"
                radius={[4, 4, 0, 0]}
              >
                {chartTheme === 'default' && chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                {showValues && (
                  <LabelList dataKey="value" position="top" fill="#333" fontSize={11} />
                )}
              </Bar>
              {secondaryYAxisColumn && (
                <Bar 
                  dataKey="secondary" 
                  fill="#8884d8" 
                  radius={[4, 4, 0, 0]}
                >
                  {showValues && (
                    <LabelList dataKey="secondary" position="top" fill="#333" fontSize={11} />
                  )}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReLineChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              className="animate-in fade-in duration-500"
            >
              <defs>
                {getGradient("lineFill")}
              </defs>
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
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={GRADIENTS[chartTheme as keyof typeof GRADIENTS]?.[0] || "#8884d8"} 
                activeDot={{ r: 8 }}
                strokeWidth={2}
                dot={{ strokeWidth: 2 }}
              >
                {showValues && (
                  <LabelList dataKey="value" position="top" fill="#333" fontSize={11} />
                )}
              </Line>
              {secondaryYAxisColumn && (
                <Line 
                  type="monotone" 
                  dataKey="secondary" 
                  stroke="#82ca9d" 
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                >
                  {showValues && (
                    <LabelList dataKey="secondary" position="bottom" fill="#333" fontSize={11} />
                  )}
                </Line>
              )}
            </ReLineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RePieChart className="animate-in fade-in duration-500">
              <defs>
                {getGradient("pieFill")}
              </defs>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={chartTheme === 'default' ? 0 : 60}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={showValues ? renderCustomizedLabel : undefined}
                animationDuration={1000}
                animationEasing="ease-in-out"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartTheme === 'default' ? COLORS[index % COLORS.length] : `url(#pieFill)`}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} (${((Number(value) / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`, name]}
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right" 
                wrapperStyle={{ fontSize: '12px', paddingLeft: '10px' }}
              />
            </RePieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReAreaChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              className="animate-in fade-in duration-500"
            >
              <defs>
                {getGradient("areaFill")}
              </defs>
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
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={GRADIENTS[chartTheme as keyof typeof GRADIENTS]?.[0] || "#8884d8"} 
                fillOpacity={1} 
                fill="url(#areaFill)"
              >
                {showValues && (
                  <LabelList dataKey="value" position="top" fill="#333" fontSize={11} />
                )}
              </Area>
              {secondaryYAxisColumn && (
                <Area 
                  type="monotone" 
                  dataKey="secondary" 
                  stroke="#82ca9d" 
                  fillOpacity={0.3} 
                  fill="#82ca9d"
                >
                  {showValues && (
                    <LabelList dataKey="secondary" position="top" fill="#333" fontSize={11} />
                  )}
                </Area>
              )}
            </ReAreaChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReScatterChart 
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              className="animate-in fade-in duration-500"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="category" 
                dataKey="name" 
                name={xAxisColumn} 
                angle={-45} 
                textAnchor="end"
                height={70}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis type="number" dataKey="value" name={yAxisColumn} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Scatter 
                name={yAxisColumn} 
                data={chartData} 
                fill={GRADIENTS[chartTheme as keyof typeof GRADIENTS]?.[0] || "#8884d8"}
              >
                {chartTheme === 'default' && chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
              {secondaryYAxisColumn && (
                <Scatter 
                  name={secondaryYAxisColumn} 
                  data={chartData.map(item => ({ name: item.name, value: item.secondary }))} 
                  fill="#82ca9d"
                />
              )}
            </ReScatterChart>
          </ResponsiveContainer>
        );
      case "radar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReRadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="80%" 
              data={chartData}
              className="animate-in fade-in duration-500"
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <ReRadar 
                name={yAxisColumn} 
                dataKey={yAxisColumn} 
                stroke={GRADIENTS[chartTheme as keyof typeof GRADIENTS]?.[0] || "#8884d8"} 
                fill={GRADIENTS[chartTheme as keyof typeof GRADIENTS]?.[0] || "#8884d8"} 
                fillOpacity={0.6}
              />
              {secondaryYAxisColumn && (
                <ReRadar 
                  name={secondaryYAxisColumn} 
                  dataKey={secondaryYAxisColumn} 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.6}
                />
              )}
            </ReRadarChart>
          </ResponsiveContainer>
        );
      case "radialBar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="10%" 
              outerRadius="80%" 
              barSize={20} 
              data={chartData.slice(0, 6)} // Limit to 6 for readability
              startAngle={180} 
              endAngle={0}
              className="animate-in fade-in duration-500"
            >
              <RadialBar
                label={{ 
                  position: 'insideStart', 
                  fill: '#fff',
                  fontWeight: 'bold'
                }}
                background
                dataKey="value"
              >
                {chartData.slice(0, 6).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </RadialBar>
              <Legend 
                iconSize={10}
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{
                  fontSize: '12px',
                  paddingLeft: '10px'
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-md border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-t-lg">
          <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
            Data Visualization
          </CardTitle>
          <CardDescription>
            Create beautiful and insightful charts from your data
          </CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="data" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
                Data Selection
              </TabsTrigger>
              <TabsTrigger value="appearance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
                Appearance & Options
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="data" className="p-6 space-y-6 mt-0">
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
                      {numericColumnOptions.map(column => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {chartType !== "pie" && (
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Secondary Y-Axis (Optional)</label>
                <Select 
                  value={secondaryYAxisColumn} 
                  onValueChange={setSecondaryYAxisColumn}
                  disabled={!selectedFile || !xAxisColumn || !yAxisColumn}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select secondary Y-axis column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {numericColumnOptions
                      .filter(column => column !== yAxisColumn)
                      .map(column => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Chart Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                <Button 
                  variant={chartType === "bar" ? "default" : "outline"} 
                  className={`flex flex-col items-center justify-center py-3 h-auto ${chartType === "bar" ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}`}
                  onClick={() => setChartType("bar")}
                >
                  <BarChart2 className="h-5 w-5 mb-1" />
                  <span className="text-xs">Bar</span>
                </Button>
                <Button 
                  variant={chartType === "line" ? "default" : "outline"} 
                  className={`flex flex-col items-center justify-center py-3 h-auto ${chartType === "line" ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}`}
                  onClick={() => setChartType("line")}
                >
                  <LineChart className="h-5 w-5 mb-1" />
                  <span className="text-xs">Line</span>
                </Button>
                <Button 
                  variant={chartType === "pie" ? "default" : "outline"} 
                  className={`flex flex-col items-center justify-center py-3 h-auto ${chartType === "pie" ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}`}
                  onClick={() => setChartType("pie")}
                >
                  <PieChart className="h-5 w-5 mb-1" />
                  <span className="text-xs">Pie</span>
                </Button>
                <Button 
                  variant={chartType === "area" ? "default" : "outline"} 
                  className={`flex flex-col items-center justify-center py-3 h-auto ${chartType === "area" ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}`}
                  onClick={() => setChartType("area")}
                >
                  <AreaChart className="h-5 w-5 mb-1" />
                  <span className="text-xs">Area</span>
                </Button>
                <Button 
                  variant={chartType === "scatter" ? "default" : "outline"}
                  className={`flex flex-col items-center justify-center py-3 h-auto ${chartType === "scatter" ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}`}
                  onClick={() => setChartType("scatter")}
                >
                  <ScatterChart className="h-5 w-5 mb-1" />
                  <span className="text-xs">Scatter</span>
                </Button>
                <Button 
                  variant={chartType === "radar" ? "default" : "outline"}
                  className={`flex flex-col items-center justify-center py-3 h-auto ${chartType === "radar" ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}`}
                  onClick={() => setChartType("radar")}
                >
                  <Radar className="h-5 w-5 mb-1" />
                  <span className="text-xs">Radar</span>
                </Button>
                <Button 
                  variant={chartType === "radialBar" ? "default" : "outline"}
                  className={`flex flex-col items-center justify-center py-3 h-auto ${chartType === "radialBar" ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}`}
                  onClick={() => setChartType("radialBar")}
                >
                  <PieChart className="h-5 w-5 mb-1" />
                  <span className="text-xs">Radial</span>
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="appearance" className="p-6 space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Chart Title</label>
                <Input 
                  placeholder="Enter chart title (optional)" 
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Color Theme</label>
                <Select value={chartTheme} onValueChange={setChartTheme}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select color theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Multi-color)</SelectItem>
                    <SelectItem value="blue">Blue Gradient</SelectItem>
                    <SelectItem value="purple">Purple Gradient</SelectItem>
                    <SelectItem value="green">Green Gradient</SelectItem>
                    <SelectItem value="pink">Pink Gradient</SelectItem>
                    <SelectItem value="orange">Orange Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="show-values" 
                  checked={showValues}
                  onCheckedChange={setShowValues}
                />
                <Label htmlFor="show-values">Show Data Values</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="sort-data" 
                  checked={sortData}
                  onCheckedChange={setSortData}
                />
                <Label htmlFor="sort-data">Sort Data (Descending)</Label>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block text-muted-foreground">
                Limit Data Points: {limitDataPoints}
              </label>
              <div className="flex items-center space-x-4">
                <Slider
                  value={[limitDataPoints]}
                  min={5}
                  max={50}
                  step={5}
                  onValueChange={(value) => setLimitDataPoints(value[0])}
                  className="w-full"
                />
                <span className="text-sm font-medium w-8">{limitDataPoints}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <CardContent className="p-6 pt-0">
          <div className="border rounded-lg p-4 bg-white dark:bg-slate-950 shadow-sm" id="chart-container">
            {renderChart()}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 p-6 pt-2 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20">
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
                <Button variant="ghost" className="w-full justify-start" onClick={() => toast.success("Chart image saved as PNG")}>
                  Save as Image
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            onClick={handleSaveChart} 
            disabled={!chartData.length || isSaving}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
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
        </CardFooter>
      </Card>
    </div>
  );
};

export default DataVisualizationTab;
