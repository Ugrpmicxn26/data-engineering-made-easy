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
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { downloadCSV } from "@/utils/fileUtils";
import TableControls, { RowFilter, PivotConfig } from "./TableControls";

interface DataTableProps {
  data: any[];
  filename?: string;
  maxHeight?: string;
}

const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  filename = "exported-data.csv",
  maxHeight = "500px"
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayData, setDisplayData] = useState<any[]>([]);
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<RowFilter[]>([]);
  const [activePivot, setActivePivot] = useState<PivotConfig | null>(null);
  const [originalData] = useState<any[]>(data);
  const rowsPerPage = 10;

  useEffect(() => {
    if (data && data.length > 0) {
      const initialColumns = Object.keys(data[0]);
      setDisplayColumns(initialColumns);
      setActiveColumns(initialColumns);
      setDisplayData(data);
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
    } else {
      setDisplayColumns(Object.keys(originalData[0]));
    }

    setDisplayData(processedData);
    setCurrentPage(1);
  }, [originalData, activeFilters, activePivot]);

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

        <TableControls 
          columns={displayColumns}
          onToggleColumns={handleToggleColumns}
          onFilterRows={handleFilterRows}
          onPivot={handlePivot}
        />
      </div>

      <div className={`overflow-auto rounded-lg border`} style={{ maxHeight }}>
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              {activeColumns.map((column) => (
                <TableHead key={column} className="font-medium">
                  {column}
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
