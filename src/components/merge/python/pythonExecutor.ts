import { ParseOptions, FileData } from "@/utils/fileUtils";
import { numToString, stringToNum } from "@/utils/typeFixes";

export interface PythonExecutionResult {
  outputText: string;
  resultData: any[];
  error: string | null;
}

const calculateStdDev = (values: number[]): number => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
};

export function executePythonCode(
  pythonCode: string, 
  file: FileData, 
  parseOptions: ParseOptions
): PythonExecutionResult {
  let outputText = "";
  let resultData = [...file.data];
  let error = null;

  try {
    // Add parsing options info to output
    outputText += `# File parsing options:\n`;
    outputText += `# Separator: "${parseOptions.separator}"\n`;
    outputText += `# Encoding: "${parseOptions.encoding}"\n\n`;
    
    if (pythonCode.includes("df.head()")) {
      const headData = resultData.slice(0, 5);
      outputText += "# DataFrame.head()\n";
      outputText += JSON.stringify(headData, null, 2) + "\n\n";
    }
    
    if (pythonCode.includes("df.columns")) {
      const columns = Object.keys(resultData[0] || {});
      outputText += "# DataFrame.columns\n";
      outputText += "Columns: " + JSON.stringify(columns) + "\n\n";
    }
    
    if (pythonCode.includes("df.info()")) {
      const columns = Object.keys(resultData[0] || {});
      outputText += "# DataFrame.info()\n";
      outputText += `<class 'pandas.core.frame.DataFrame'>\n`;
      outputText += `RangeIndex: ${resultData.length} entries, 0 to ${resultData.length - 1}\n`;
      outputText += `Data columns (total ${columns.length}):\n`;
      columns.forEach((col, i) => {
        outputText += ` #   ${i} ${col}  ${resultData.length} non-null\n`;
      });
      outputText += `dtypes: object(${columns.length})\n\n`;
    }
    
    if (pythonCode.includes("df.describe()")) {
      const columns = Object.keys(resultData[0] || {});
      outputText += "# DataFrame.describe()\n";
      
      const numericColumns = columns.filter(col => {
        return resultData.some(row => !isNaN(Number(row[col])));
      });
      
      if (numericColumns.length > 0) {
        const stats: Record<string, Record<string, string>> = {};
        numericColumns.forEach(col => {
          const values = resultData
            .map(row => row[col])
            .filter(val => !isNaN(Number(val)))
            .map(Number);
          
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const mean = sum / values.length;
            const sortedValues = [...values].sort((a, b) => a - b);
            const median = sortedValues[Math.floor(sortedValues.length / 2)];
            
            if (!stats['count']) stats['count'] = {};
            if (!stats['mean']) stats['mean'] = {};
            if (!stats['std']) stats['std'] = {};
            if (!stats['min']) stats['min'] = {};
            if (!stats['25%']) stats['25%'] = {};
            if (!stats['50%']) stats['50%'] = {};
            if (!stats['75%']) stats['75%'] = {};
            if (!stats['max']) stats['max'] = {};
            
            stats['count'][col] = numToString(values.length);
            stats['mean'][col] = mean.toFixed(6);
            stats['std'][col] = calculateStdDev(values).toFixed(6);
            stats['min'][col] = Math.min(...values).toFixed(6);
            const percentile25 = sortedValues[Math.floor(sortedValues.length * 0.25)].toFixed(6);
            stats['25%'][col] = numToString(stringToNum(percentile25));
            stats['50%'][col] = median.toFixed(6);
            const percentile75 = sortedValues[Math.floor(sortedValues.length * 0.75)].toFixed(6);
            stats['75%'][col] = numToString(stringToNum(percentile75));
            stats['max'][col] = Math.max(...values).toFixed(6);
          }
        });
        
        outputText += `              ${numericColumns.join('       ')}\n`;
        Object.keys(stats).forEach(stat => {
          outputText += `${stat.padEnd(8)} `;
          numericColumns.forEach(col => {
            outputText += `${stats[stat][col]?.toString().padEnd(10) || 'NaN'.padEnd(10)} `;
          });
          outputText += '\n';
        });
        outputText += '\n';
      } else {
        outputText += "No numeric columns found for statistical analysis\n\n";
      }
    }
    
    // Process data transformation operations
    processDataTransformations(pythonCode, resultData, outputText);
    
    outputText += "# Final DataFrame Result:\n";
    outputText += `# [${resultData.length} rows × ${Object.keys(resultData[0] || {}).length} columns]\n`;
    
    return { outputText, resultData, error };
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error occurred";
    return { outputText, resultData, error };
  }
}

function processDataTransformations(
  pythonCode: string, 
  resultData: any[], 
  outputText: string
): void {
  // Filtering operations
  if (pythonCode.includes("df[df['")) {
    const filterMatch = pythonCode.match(/df\[df\['([^']+)'\] ([><=!]+) ([^\]]+)\]/);
    if (filterMatch) {
      const [_, column, operator, valueStr] = filterMatch;
      let value;
      
      if (valueStr.includes("'") || valueStr.includes('"')) {
        value = valueStr.replace(/['"]/g, '').trim();
      } else {
        value = Number(valueStr.trim());
      }
      
      resultData = resultData.filter(row => {
        const colValue = isNaN(Number(row[column])) ? row[column] : Number(row[column]);
        switch (operator) {
          case '>': return colValue > value;
          case '<': return colValue < value;
          case '>=': return colValue >= value;
          case '<=': return colValue <= value;
          case '==': return colValue === value;
          case '!=': return colValue !== value;
          default: return true;
        }
      });
      
      outputText += `# Filtered by ${column} ${operator} ${value}\n`;
      outputText += `# Result has ${resultData.length} rows\n\n`;
    }
  }
  
  // Data type conversion operations
  const astypeRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.astype\(([^)]+)\)/g;
  let astypeMatch;
  while ((astypeMatch = astypeRegex.exec(pythonCode)) !== null) {
    const [_, targetCol, sourceCol, dataType] = astypeMatch;
    outputText += `# Converting column '${targetCol}' to ${dataType}\n`;
    
    if (dataType.includes("str")) {
      resultData = resultData.map(row => ({
        ...row,
        [targetCol]: String(row[sourceCol] || "")
      }));
    } else if (dataType.includes("int")) {
      resultData = resultData.map(row => ({
        ...row,
        [targetCol]: String(parseInt(String(row[sourceCol]).replace(/[^\d.-]/g, "")) || "0")
      }));
    } else if (dataType.includes("float")) {
      resultData = resultData.map(row => ({
        ...row,
        [targetCol]: String(parseFloat(String(row[sourceCol]).replace(/[^\d.-]/g, "")) || "0")
      }));
    }
  }
  
  // String operations
  const stripRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.str\.strip\(\)/g;
  let stripMatch;
  while ((stripMatch = stripRegex.exec(pythonCode)) !== null) {
    const [_, targetCol, sourceCol] = stripMatch;
    outputText += `# Stripping whitespace from column '${targetCol}'\n`;
    
    resultData = resultData.map(row => ({
      ...row,
      [targetCol]: String(row[sourceCol] || "").trim()
    }));
  }
  
  // String replace operations
  const replaceRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.str\.replace\('([^']+)',\s*'([^']*)'\)/g;
  let replaceMatch;
  while ((replaceMatch = replaceRegex.exec(pythonCode)) !== null) {
    const [_, targetCol, sourceCol, find, replace] = replaceMatch;
    outputText += `# Replacing '${find}' with '${replace}' in column '${targetCol}'\n`;
    
    resultData = resultData.map(row => ({
      ...row,
      [targetCol]: String(row[sourceCol] || "").replace(new RegExp(find, 'g'), replace)
    }));
  }
  
  // Special case for replacing asterisks
  if (pythonCode.includes(".replace('*', 0)") || pythonCode.includes(".replace('*',0)")) {
    const replaceStarRegex = /df\['([^']+)'\].*replace\('\*',\s*0\)/;
    const replaceMatch = pythonCode.match(replaceStarRegex);
    if (replaceMatch) {
      const [_, column] = replaceMatch;
      outputText += `# Replacing '*' with 0 in column '${column}'\n`;
      
      resultData = resultData.map(row => ({
        ...row,
        [column]: String(row[column]).replace(/\*/g, "0")
      }));
    }
  }
  
  // Complex replace-and-convert operations
  const complexReplaceRegex = /df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\.str\.replace\('([^']+)',\s*'([^']*)'\)\.replace\('([^']+)',\s*([^)]+)\)\.astype\(([^)]+)\)/;
  const complexMatch = pythonCode.match(complexReplaceRegex);
  if (complexMatch) {
    const [_, targetCol, sourceCol, find1, replace1, find2, replace2, dataType] = complexMatch;
    outputText += `# Complex operation on column '${targetCol}'\n`;
    
    resultData = resultData.map(row => {
      let value = String(row[sourceCol] || "");
      value = value.replace(new RegExp(find1, 'g'), replace1);
      let replaceValue = replace2.trim();
      if (replaceValue.startsWith("'") || replaceValue.startsWith('"')) {
        replaceValue = replaceValue.replace(/['"]/g, '');
      }
      value = value.replace(new RegExp(find2, 'g'), replaceValue);
      
      if (dataType.includes("int")) {
        value = String(parseInt(value.replace(/[^\d.-]/g, "")) || "0");
      } else if (dataType.includes("float")) {
        value = String(parseFloat(value.replace(/[^\d.-]/g, "")) || "0");
      }
      
      return {
        ...row,
        [targetCol]: value
      };
    });
  }
  
  // Adding new columns
  const newColMatch = pythonCode.match(/df\['([^']+)'\] = (.+)/);
  if (newColMatch && !astypeMatch && !stripMatch && !replaceMatch && !complexMatch) {
    const [_, newCol, expression] = newColMatch;
    outputText += `# Created new column: '${newCol}'\n\n`;
    
    if (expression.includes("df['") && expression.includes("*")) {
      const colsMatch = expression.match(/df\['([^']+)'\] \* df\['([^']+)'\]/);
      if (colsMatch) {
        const [_, col1, col2] = colsMatch;
        resultData = resultData.map(row => ({
          ...row,
          [newCol]: numToString(Number(row[col1]) * Number(row[col2]))
        }));
      }
    }
  }
  
  // Group by operations
  if (pythonCode.includes("df.groupby(")) {
    const groupByMatch = pythonCode.match(/df\.groupby\(\[([^\]]+)\]\)\['([^']+)'\]\.([^(]+)\(\)\.reset_index\(\)/);
    if (groupByMatch) {
      const [_, groupColsStr, aggCol, aggFunc] = groupByMatch;
      const groupCols = groupColsStr.split(',').map(col => 
        col.trim().replace(/['"]/g, '')
      );
      
      outputText += `# Grouping by: [${groupCols.join(', ')}], aggregating ${aggCol} with ${aggFunc}\n`;
      
      const groups: Record<string, any> = {};
      resultData.forEach(row => {
        const key = groupCols.map(col => String(row[col])).join('|');
        if (!groups[key]) {
          groups[key] = {
            rows: [],
            groupValues: {}
          };
          groupCols.forEach(col => {
            groups[key].groupValues[col] = row[col];
          });
        }
        groups[key].rows.push(row);
      });
      
      resultData = Object.values(groups).map((group: any) => {
        const aggRows = group.rows;
        let aggValue = 0;
        
        if (aggFunc.includes('sum')) {
          aggValue = aggRows.reduce((acc: number, row: any) => acc + (Number(row[aggCol]) || 0), 0);
        } else if (aggFunc.includes('mean') || aggFunc.includes('avg')) {
          const sum = aggRows.reduce((acc: number, row: any) => acc + (Number(row[aggCol]) || 0), 0);
          aggValue = sum / aggRows.length;
        } else if (aggFunc.includes('count')) {
          aggValue = aggRows.length;
        } else if (aggFunc.includes('min')) {
          aggValue = Math.min(...aggRows.map((row: any) => Number(row[aggCol]) || 0));
        } else if (aggFunc.includes('max')) {
          aggValue = Math.max(...aggRows.map((row: any) => Number(row[aggCol]) || 0));
        }
        
        return {
          ...group.groupValues,
          [aggCol]: String(aggValue)
        };
      });
      
      outputText += `# Result has ${resultData.length} rows\n\n`;
    }
  }
  
  // Transform operations
  if (pythonCode.includes("df.transform(")) {
    const transformMatch = pythonCode.match(/df\.groupby\(\[([^\]]+)\]\)\['([^']+)'\]\.transform\('([^']+)'\)/);
    if (transformMatch) {
      const [_, groupColsStr, aggCol, aggFunc] = transformMatch;
      const groupCols = groupColsStr.split(',').map(col => 
        col.trim().replace(/['"]/g, '')
      );
      
      outputText += `# Computing transformed values for ${aggCol} grouped by [${groupCols.join(', ')}]\n`;
      
      const groups: Record<string, any> = {};
      resultData.forEach(row => {
        const key = groupCols.map(col => String(row[col])).join('|');
        if (!groups[key]) {
          groups[key] = {
            rows: [],
            groupValues: {}
          };
          groupCols.forEach(col => {
            groups[key].groupValues[col] = row[col];
          });
        }
        groups[key].rows.push(row);
      });
      
      const groupAggs: Record<string, number> = {};
      Object.entries(groups).forEach(([key, group]: [string, any]) => {
        const aggRows = group.rows;
        
        if (aggFunc.includes('sum')) {
          groupAggs[key] = aggRows.reduce((acc: number, row: any) => acc + (Number(row[aggCol]) || 0), 0);
        } else if (aggFunc.includes('mean') || aggFunc.includes('avg')) {
          const sum = aggRows.reduce((acc: number, row: any) => acc + (Number(row[aggCol]) || 0), 0);
          groupAggs[key] = sum / aggRows.length;
        } else if (aggFunc.includes('count')) {
          groupAggs[key] = aggRows.length;
        }
      });
      
      const newColName = `${aggCol}_${aggFunc}`;
      resultData = resultData.map(row => {
        const key = groupCols.map(col => String(row[col])).join('|');
        return {
          ...row,
          [newColName]: String(groupAggs[key] || "0")
        };
      });
    }
  }
  
  // Merge operation warning
  if (pythonCode.includes("df.merge(")) {
    outputText += "# Merge operation detected\n";
    outputText += "# Note: Browser simulation has limited merge capabilities\n";
    
    const mergeMatch = pythonCode.match(/df\.merge\(([^)]+)\)/);
    if (mergeMatch) {
      const [_, mergeArgs] = mergeMatch;
      outputText += `# Merge arguments: ${mergeArgs}\n`;
    }
  }
  
  // Market share calculations
  const marketShareMatch = pythonCode.match(/df\['([^']+)'\]\s*=\s*df\['([^']+)'\]\s*\/\s*df\['([^']+)'\]/);
  if (marketShareMatch) {
    const [_, newCol, numerator, denominator] = marketShareMatch;
    outputText += `# Computing ${newCol} as ${numerator} / ${denominator}\n`;
    
    resultData = resultData.map(row => {
      const num = Number(row[numerator]) || 0;
      const den = Number(row[denominator]) || 1;
      const result = den === 0 ? 0 : num / den;
      return {
        ...row,
        [newCol]: numToString(result)
      };
    });
  }
  
  // Fill NA values
  if (pythonCode.includes("df.fillna(")) {
    const fillnaMatch = pythonCode.match(/df\['([^']+)'\].fillna\(([^)]+)\)/);
    if (fillnaMatch) {
      const [_, col, fillValue] = fillnaMatch;
      let value = fillValue.trim();
      if (value.startsWith("'") || value.startsWith('"')) {
        value = value.replace(/['"]/g, '');
      } else if (!isNaN(Number(value))) {
        value = numToString(Number(value));
      }
      
      outputText += `# Filling NA values in ${col} with ${value}\n`;
      
      resultData = resultData.map(row => ({
        ...row,
        [col]: row[col] === null || row[col] === undefined || String(row[col]).trim() === '' 
          ? value 
          : row[col]
      }));
    }
  }
  
  // Drop columns
  if (pythonCode.includes("df.drop(columns=")) {
    const dropMatch = pythonCode.match(/df\.drop\(columns=\[([^\]]+)\],\s*inplace=True\)/);
    if (dropMatch) {
      const [_, colsStr] = dropMatch;
      const colsToDrop = colsStr.split(',').map(col => 
        col.trim().replace(/['"]/g, '')
      );
      
      outputText += `# Dropping columns: ${colsToDrop.join(', ')}\n`;
      
      resultData = resultData.map(row => {
        const newRow = {...row};
        colsToDrop.forEach(col => {
          delete newRow[col];
        });
        return newRow;
      });
    }
  }
}
