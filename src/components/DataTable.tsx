
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
import { ChevronLeft, ChevronRight, Download, Search, Info } from "lucide-react";
import { downloadCSV, detectColumnTypes, ColumnInfo } from "@/utils/fileUtils";
import TableControls, { RowFilter, PivotConfig } from "./TableControls";
import { ensureArray } from "@/utils/type-correction";

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
  // Ensure data is safe
  const safeData = ensureArray(data);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayData, setDisplayData] = useState<any[]>([]);
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<RowFilter[]>([]);
  const [activePivot, setActivePivot] = useState<PivotConfig | null>(null);
  const [originalData] = useState<any[]>(safeData);
  const [columnInfo, setColumnInfo] = useState<Record<string, ColumnInfo>>({});
  const [showDataTypes, setShowDataTypes] = useState(false);

  const rowsPerPage = 10;

  useEffect(() => {
    if (safeData && safeData.length > 0 && typeof safeData[0] === 'object' && safeData[0] !== null) {
      const initialColumns = Object.keys(safeData[0]);
      setDisplayColumns(initialColumns);
      setActiveColumns(initialColumns);
      setDisplayData(safeData);
      
      const detectedColumnInfo = detectColumnTypes(safeData);
      setColumnInfo(detectedColumnInfo);
    }
  }, [safeData]);

  useEffect(() => {
    if (!originalData || originalData.length === 0) return;

    let processedData = [...originalData];

    if (activeFilters.length > 0) {
      processedData = processedData.filter(row => {
        if (!row) return false;
        return activeFilters.every(filter => {
          if (!filter || !filter.column || !filter.value) return true;
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
        originalData
          .filter(item => item)
          .map(item => item[activePivot.pivotColumn])
      )].filter(Boolean);
      
      if (originalData.length > 0 && originalData[0]) {
        const remainingColumns = Object.keys(originalData[0])
          .filter(col => col !== activePivot.pivotColumn && col !== activePivot.valueColumn);
        
        const groupedData: Record<string, any> = {};
        
        originalData.forEach(row => {
          if (!row) return;
          
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
      }
    } else if (originalData.length > 0 && originalData[0]) {
      setDisplayColumns(Object.keys(originalData[0]));
    }

    setDisplayData(processedData);
    setCurrentPage(1);
  }, [originalData, activeFilters, activePivot, onDataUpdate]);

  const filteredData = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];
    
    return displayData.filter((row) => {
      if (!row) return false;
      return Object.keys(row).some(
        key => 
          activeColumns.includes(key) && 
          row[key] !== null && 
          row[key] !== undefined && 
          row[key].toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [displayData, searchTerm, activeColumns]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDownload = () => {
    const dataToDownload = filteredData.map(row => {
      if (!row) return {};
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

  if (!safeData || safeData.length === 0) {
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
