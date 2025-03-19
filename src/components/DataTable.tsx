import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Download, Search, Info, BarChart2 } from "lucide-react";
import { downloadCSV, detectColumnTypes, ColumnInfo } from "@/utils/fileUtils";
import TableControls, { RowFilter, PivotConfig } from "./TableControls";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface DataTableProps {
  data: any[];
  filename?: string;
  maxHeight?: string;
  onDataUpdate?: (updatedData: any[]) => void;
}

const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  filename = "exported-data.csv",
  maxHeight = "500px",
  onDataUpdate
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayData, setDisplayData] = useState<any[]>([]);
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<RowFilter[]>([]);
  const [activePivot, setActivePivot] = useState<PivotConfig | null>(null);
  const [originalData] = useState<any[]>(data);
  const [columnInfo, setColumnInfo] = useState<Record<string, ColumnInfo>>({});
  const [showDataTypes, setShowDataTypes] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [chartConfig, setChartConfig] = useState({
    labelColumn: '',
    valueColumn: ''
  });

  const rowsPerPage = 10;

  useEffect(() => {
    if (data && data.length > 0) {
      const initialColumns = Object.keys(data[0]);
      setDisplayColumns(initialColumns);
      setActiveColumns(initialColumns);
      setDisplayData(data);
      
      const detectedColumnInfo = detectColumnTypes(data);
      setColumnInfo(detectedColumnInfo);

      const marketShareColumns = initialColumns.filter(col => 
        col.toLowerCase().includes('market') || 
        col.toLowerCase().includes('share') || 
        col.toLowerCase().includes('percent')
      );
      
      if (marketShareColumns.length > 0) {
        const possibleLabelColumns = initialColumns.filter(col => {
          const info = detectedColumnInfo[col];
          return info && info.type !== 'integer' && info.type !== 'decimal';
        });
        
        if (possibleLabelColumns.length > 0 && marketShareColumns.length > 0) {
          setChartConfig({
            labelColumn: possibleLabelColumns[0],
            valueColumn: marketShareColumns[0]
          });
          setShowChart(true);
        }
      }
    }
  }, [data]);

  useEffect(() => {
    if (!originalData || originalData.length === 0) return;

    let processedData = [...originalData];

    if (activeFilters.length > 0) {
      processedData = processedData.filter(row => {
        return activeFilters.every(filter => {
          const columnValue = row[filter.column]?.toString().toLowerCase() || '';
          const filterValue = filter.value.toLowerCase();
          const matches = columnValue.includes(filterValue);
          return filter.exclude ? !matches : matches;
        });
      });
      
      if (onDataUpdate) {
        onDataUpdate(processedData);
      }
    }
    
    if (activePivot && activePivot.pivotColumn && activePivot.valueColumn) {
      const pivotValues = [...new Set(
        originalData.map(item => item[activePivot.pivotColumn])
      )].filter(Boolean);
      
      const remainingColumns = Object.keys(originalData[0])
        .filter(col => col !== activePivot.pivotColumn && col !== activePivot.valueColumn);
      
      const groupedData: Record<string, any> = {};
      
      originalData.forEach(row => {
        const groupKey = remainingColumns.map(col => `${col}:${row[col]}`).join('|');
        
        if (!groupedData[groupKey]) {
          const groupRow: Record<string, any> = {};
          remainingColumns.forEach(col => {
            groupRow[col] = row[col];
          });
          
          pivotValues.forEach(pivotVal => {
            groupRow[`${activePivot.pivotColumn}_${pivotVal}`] = null;
          });
          
          groupedData[groupKey] = groupRow;
        }
        
        const pivotVal = row[activePivot.pivotColumn];
        if (pivotVal) {
          groupedData[groupKey][`${activePivot.pivotColumn}_${pivotVal}`] = row[activePivot.valueColumn];
        }
      });
      
      processedData = Object.values(groupedData);
      
      const pivotColumns = pivotValues.map(val => `${activePivot.pivotColumn}_${val}`);
      setDisplayColumns([...remainingColumns, ...pivotColumns]);
      setActiveColumns([...remainingColumns, ...pivotColumns]);
      
      if (onDataUpdate) {
        onDataUpdate(processedData);
      }
    } else {
      setDisplayColumns(Object.keys(originalData[0]));
    }

    setDisplayData(processedData);
    setCurrentPage(1);
  }, [originalData, activeFilters, activePivot, onDataUpdate]);

  const filteredData = useMemo(() => {
    if (!displayData) return [];
    
    return displayData.filter((row) =>
      Object.keys(row).some(
        key => 
          activeColumns.includes(key) && 
          row[key] && 
          row[key].toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [displayData, searchTerm, activeColumns]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const chartData = useMemo(() => {
    if (!showChart || !chartConfig.labelColumn || !chartConfig.valueColumn) return [];
    
    return filteredData.map(row => ({
      name: String(row[chartConfig.labelColumn] || 'Unnamed'),
      value: isNaN(Number(row[chartConfig.valueColumn])) ? 0 : Number(row[chartConfig.valueColumn])
    })).sort((a, b) => b.value - a.value);
  }, [filteredData, showChart, chartConfig]);

  const generateColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(`hsl(${(i * 360) / count}, 70%, 50%)`);
    }
    return colors;
  };

  const chartColors = useMemo(() => generateColors(chartData.length), [chartData.length]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDownload = () => {
    const dataToDownload = filteredData.map(row => {
      const newRow: Record<string, any> = {};
      activeColumns.forEach(col => {
        newRow[col] = row[col];
      });
      return newRow;
    });
    
    downloadCSV(dataToDownload, filename);
  };

  const handleToggleColumns = (columns: string[]) => {
    setActiveColumns(columns);
  };

  const handleFilterRows = (filters: RowFilter[]) => {
    setActiveFilters(filters);
  };

  const handlePivot = (config: PivotConfig | null) => {
    setActivePivot(config);
  };

  const toggleDataTypes = () => {
    setShowDataTypes(!showDataTypes);
  };

  const toggleChart = () => {
    setShowChart(!showChart);
  };

  const toggleChartType = () => {
    setChartType(chartType === 'pie' ? 'bar' : 'pie');
  };

  const handleChartConfigChange = (field: 'labelColumn' | 'valueColumn', value: string) => {
    setChartConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTypeColorClass = (type: string) => {
    switch (type) {
      case 'integer':
      case 'decimal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'date':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
  };

  const numericColumns = Object.entries(columnInfo)
    .filter(([_, info]) => info.type === 'integer' || info.type === 'decimal')
    .map(([col]) => col);

  const textColumns = Object.entries(columnInfo)
    .filter(([_, info]) => info.type !== 'integer' && info.type !== 'decimal')
    .map(([col]) => col);

  const formatChartValue = (value: any): string => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col space-y-2 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDataTypes}
              className={showDataTypes ? "bg-primary/10" : ""}
            >
              <Info className="mr-2 h-4 w-4" />
              {showDataTypes ? "Hide Types" : "Show Types"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleChart}
              className={showChart ? "bg-primary/10" : ""}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              {showChart ? "Hide Chart" : "Show Chart"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="hover-scale"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </div>

        <TableControls 
          columns={displayColumns}
          onToggleColumns={handleToggleColumns}
          onFilterRows={handleFilterRows}
          onPivot={handlePivot}
          columnInfo={columnInfo}
        />
      </div>

      {showChart && chartData.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg bg-card/40 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="text-lg font-medium">Data Visualization</h3>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleChartType}
              >
                Switch to {chartType === 'pie' ? 'Bar' : 'Pie'} Chart
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1 block">Label Column</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={chartConfig.labelColumn}
                onChange={e => handleChartConfigChange('labelColumn', e.target.value)}
              >
                <option value="">Select label column</option>
                {textColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Value Column</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={chartConfig.valueColumn}
                onChange={e => handleChartConfigChange('valueColumn', e.target.value)}
              >
                <option value="">Select value column</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="w-full" style={{ height: '300px' }}>
            {chartType === 'pie' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={true}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatChartValue(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatChartValue(value)} />
                  <Bar dataKey="value">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className={`overflow-auto rounded-lg border`} style={{ maxHeight }}>
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              {activeColumns.map((column) => (
                <TableHead key={column} className="font-medium">
                  <div className="flex items-center gap-1">
                    {column}
                    {showDataTypes && columnInfo[column] && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-1 py-0 h-5 ${getTypeColorClass(columnInfo[column].type)}`}
                            >
                              {columnInfo[column].type}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="text-xs">Sample values:</p>
                              <ul className="text-xs">
                                {columnInfo[column].sampleValues.map((val, idx) => (
                                  <li key={idx}>{val}</li>
                                ))}
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-muted/40">
                {activeColumns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`} className="truncate max-w-[200px]">
                    {row[column] !== undefined && row[column] !== null
                      ? row[column].toString()
                      : ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={activeColumns.length} className="text-center py-8 text-muted-foreground">
                  No matching results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredData.length)} of {filteredData.length} entries
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                let pageNum;
                
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
