import React, { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Download, Search, Info, Loader2 } from "lucide-react";
import { downloadCSV, detectColumnTypes, ColumnInfo } from "@/utils/fileUtils";
import TableControls, { RowFilter, PivotConfig } from "./TableControls";
import { useChunkedData } from "@/hooks/useChunkedData";
import { toast } from "sonner";

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
  const chunkedData = useChunkedData(20); // Use 20 rows per page for better performance
  const [searchTerm, setSearchTerm] = useState("");
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<RowFilter[]>([]);
  const [activePivot, setActivePivot] = useState<PivotConfig | null>(null);
  const [columnInfo, setColumnInfo] = useState<Record<string, ColumnInfo>>({});
  const [showDataTypes, setShowDataTypes] = useState(false);

  // Store data in chunked format when data prop changes
  useEffect(() => {
    if (data && data.length > 0) {
      chunkedData.storeData(filename, data);
      const initialColumns = Object.keys(data[0]);
      setActiveColumns(initialColumns);
      
      const detectedColumnInfo = detectColumnTypes(data);
      setColumnInfo(detectedColumnInfo);
    }
  }, [data, filename]);

  const handleDownload = async () => {
    if (!chunkedData.datasetInfo) return;
    
    try {
      toast.info("Preparing download...");
      
      // For large datasets, download in chunks to avoid memory issues
      const allData = [];
      const totalRows = chunkedData.datasetInfo.totalRows;
      const chunkSize = 500; // Download in chunks of 500 rows
      
      for (let i = 0; i < totalRows; i += chunkSize) {
        const endRow = Math.min(i + chunkSize - 1, totalRows - 1);
        const chunkData = await chunkedData.getSampleData ? 
          await chunkedData.getSampleData(endRow - i + 1) : 
          [];
        allData.push(...chunkData);
        
        // Update progress
        const progress = Math.round(((i + chunkSize) / totalRows) * 100);
        if (progress <= 100) {
          toast.info(`Download progress: ${Math.min(progress, 100)}%`);
        }
      }
      
      const dataToDownload = allData.map(row => {
        const newRow: Record<string, any> = {};
        activeColumns.forEach(col => {
          newRow[col] = row[col];
        });
        return newRow;
      });
      
      downloadCSV(dataToDownload, filename);
      toast.success("Download completed!");
    } catch (error) {
      toast.error("Download failed. Try reducing the data size.");
    }
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

  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  if (chunkedData.loading) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-muted-foreground">Loading data...</p>
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
              disabled={!chunkedData.datasetInfo}
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </div>

        {chunkedData.datasetInfo && (
          <TableControls 
            columns={chunkedData.datasetInfo.columns}
            onToggleColumns={handleToggleColumns}
            onFilterRows={handleFilterRows}
            onPivot={handlePivot}
            columnInfo={columnInfo}
          />
        )}
      </div>

      {chunkedData.datasetInfo && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Dataset: <span className="font-medium">{chunkedData.datasetInfo.datasetName}</span> | 
            Total Rows: <span className="font-medium">{chunkedData.datasetInfo.totalRows.toLocaleString()}</span> | 
            Page {chunkedData.currentPage + 1} of {chunkedData.totalPages}
          </p>
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
            {chunkedData.currentData.map((row, rowIndex) => (
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
            
            {chunkedData.currentData.length === 0 && (
              <TableRow>
                <TableCell colSpan={activeColumns.length} className="text-center py-8 text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {chunkedData.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing page {chunkedData.currentPage + 1} of {chunkedData.totalPages} 
            ({chunkedData.currentData.length} rows on this page)
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => chunkedData.loadPage(Math.max(0, chunkedData.currentPage - 1))}
              disabled={chunkedData.currentPage === 0 || chunkedData.loading}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(chunkedData.totalPages, 5))].map((_, i) => {
                let pageNum;
                
                if (chunkedData.totalPages <= 5) {
                  pageNum = i;
                } else if (chunkedData.currentPage <= 2) {
                  pageNum = i;
                } else if (chunkedData.currentPage >= chunkedData.totalPages - 3) {
                  pageNum = chunkedData.totalPages - 5 + i;
                } else {
                  pageNum = chunkedData.currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={chunkedData.currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => chunkedData.loadPage(pageNum)}
                    className="h-8 w-8 p-0"
                    disabled={chunkedData.loading}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => chunkedData.loadPage(Math.min(chunkedData.totalPages - 1, chunkedData.currentPage + 1))}
              disabled={chunkedData.currentPage >= chunkedData.totalPages - 1 || chunkedData.loading}
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