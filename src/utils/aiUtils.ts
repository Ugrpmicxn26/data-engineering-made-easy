
import { FileData } from "@/utils/fileUtils";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  requiresKey: boolean;
  isOpenSource?: boolean;
  avatar?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
}

export const models: AIModel[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast and efficient model for most tasks",
    requiresKey: true,
    avatar: "🟢"
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "More powerful model with advanced reasoning",
    requiresKey: true,
    avatar: "🔵"
  },
  {
    id: "mistral-small",
    name: "Mistral Small",
    provider: "Mistral AI",
    description: "Efficient open-weight model with good performance",
    requiresKey: true,
    avatar: "🧠"
  },
  {
    id: "mistral-medium",
    name: "Mistral Medium",
    provider: "Mistral AI",
    description: "More powerful open-weight model for complex tasks",
    requiresKey: true,
    avatar: "🧩"
  },
  {
    id: "llama-3.1-sonar-small-128k-online",
    name: "Llama 3.1 Sonar Small",
    provider: "Perplexity",
    description: "Efficient model for general tasks",
    requiresKey: true,
    avatar: "🦙"
  },
  {
    id: "llama-3.1-sonar-large-128k-online",
    name: "Llama 3.1 Sonar Large",
    provider: "Perplexity",
    description: "More powerful model with enhanced reasoning",
    requiresKey: true,
    avatar: "🦙"
  },
  {
    id: "local-model",
    name: "Local Model",
    provider: "Open Source",
    description: "Fast local processing with no API key required",
    requiresKey: false,
    isOpenSource: true,
    avatar: "💻"
  }
];

export const getModelInfo = (modelId: string): AIModel => {
  return models.find(model => model.id === modelId) || {
    id: "unknown",
    name: "Unknown Model",
    provider: "Unknown",
    description: "Unknown model",
    requiresKey: false,
    avatar: "❓"
  };
};

export const processLocalAI = async (prompt: string, fileData: FileData | null): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  if (!fileData) {
    return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload a file in the main application or in the Upload tab.";
  }

  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes("unique") || promptLower.includes("distinct") || promptLower.includes("list values") || 
      promptLower.includes("all values") || promptLower.includes("possible values")) {
    
    let targetColumn = null;
    for (const col of fileData.columns) {
      if (promptLower.includes(col.toLowerCase())) {
        targetColumn = col;
        break;
      }
    }
    
    if (targetColumn) {
      const uniqueValues = Array.from(new Set(
        fileData.data.map(row => row[targetColumn] || "(empty)")
      )).sort();
      
      let response = `# Unique Values in "${targetColumn}" Column\n\n`;
      response += `I found ${uniqueValues.length} unique values in column "${targetColumn}" from dataset "${fileData.name}":\n\n`;
      
      if (uniqueValues.length <= 50) {
        response += uniqueValues.map(val => `- "${val}"`).join('\n');
      } else {
        response += uniqueValues.slice(0, 30).map(val => `- "${val}"`).join('\n');
        response += `\n\n...and ${uniqueValues.length - 30} more unique values. `;
        response += `The dataset has ${fileData.data.length} total rows.`;
      }
      
      const valueCounts: {[key: string]: number} = {};
      fileData.data.forEach(row => {
        const val = row[targetColumn] || "(empty)";
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });
      
      const topValues = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      if (topValues.length > 0) {
        response += "\n\n## Most Frequent Values\n\n";
        response += topValues.map(([val, count]) => 
          `- "${val}": ${count} occurrences (${((count/fileData.data.length)*100).toFixed(1)}% of data)`)
          .join('\n');
      }
      
      return response;
    } else {
      return `Please specify which column you want to see unique values for. Available columns are: ${fileData.columns.join(", ")}`;
    }
  }
  
  if (promptLower.includes("statistics") || promptLower.includes("stats") || promptLower.includes("summary") || 
      promptLower.includes("describe") || promptLower.includes("overview")) {
    const numRows = fileData.data.length;
    const numCols = fileData.columns.length;
    
    let numericalStats = "";
    try {
      const numericColumns = fileData.columns.filter(col => 
        fileData.data.some(row => !isNaN(parseFloat(row[col])))
      );
      
      if (numericColumns.length > 0) {
        numericalStats = "\n\n**Numeric Column Statistics:**\n";
        
        for (const col of numericColumns.slice(0, 5)) {
          const values = fileData.data
            .map(row => parseFloat(row[col]))
            .filter(val => !isNaN(val));
            
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const sortedVals = [...values].sort((a, b) => a - b);
            const median = sortedVals.length % 2 === 0 
              ? (sortedVals[sortedVals.length/2 - 1] + sortedVals[sortedVals.length/2]) / 2 
              : sortedVals[Math.floor(sortedVals.length/2)];
            
            numericalStats += `\n- **${col}**: Min: ${min.toFixed(2)}, Max: ${max.toFixed(2)}, Avg: ${avg.toFixed(2)}, Median: ${median.toFixed(2)}`;
          }
        }
      }
    } catch (e) {
      numericalStats = "\n\nCould not calculate numerical statistics for this dataset.";
    }

    let categoricalStats = "";
    try {
      const categoricalColumns = fileData.columns.filter(col => {
        const uniqueValues = new Set(fileData.data.map(row => row[col]));
        return uniqueValues.size < Math.min(20, fileData.data.length * 0.2);
      }).slice(0, 3);
      
      if (categoricalColumns.length > 0) {
        categoricalStats = "\n\n**Categorical Column Distributions:**\n";
        
        for (const col of categoricalColumns) {
          const valueCounts: {[key: string]: number} = {};
          fileData.data.forEach(row => {
            const val = row[col] || "(empty)";
            valueCounts[val] = (valueCounts[val] || 0) + 1;
          });
          
          const topValues = Object.entries(valueCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
            
          categoricalStats += `\n- **${col}**: ${topValues.map(([val, count]) => 
            `"${val}": ${count} rows (${(count/fileData.data.length*100).toFixed(1)}%)`).join(', ')}`;
        }
      }
    } catch (e) {
      // Skip if error
    }
    
    return `# Data Summary for "${fileData.name}"\n\n` +
      `- **Rows**: ${numRows}\n` +
      `- **Columns**: ${numCols}\n` +
      `- **Column names**: ${fileData.columns.join(", ")}\n` +
      `${numericalStats}` +
      `${categoricalStats}\n\n` +
      `**Sample Data (first 3 rows):**\n\`\`\`\n${JSON.stringify(fileData.data.slice(0, 3), null, 2)}\n\`\`\``;
  }
  
  if (promptLower.includes("count") || promptLower.includes("how many") || promptLower.includes("filter")) {
    const columnNames = fileData.columns;
    
    let targetColumn = null;
    for (const col of columnNames) {
      if (promptLower.includes(col.toLowerCase())) {
        targetColumn = col;
        break;
      }
    }
    
    if (targetColumn) {
      let operation = null;
      let comparisonValue = null;
      
      const comparisonTerms = [
        { term: "greater than", op: ">" },
        { term: "more than", op: ">" },
        { term: "larger than", op: ">" },
        { term: "higher than", op: ">" },
        { term: "less than", op: "<" },
        { term: "smaller than", op: "<" },
        { term: "lower than", op: "<" },
        { term: "equal to", op: "=" },
        { term: "equals", op: "=" },
        { term: "is", op: "=" },
        { term: "contains", op: "contains" },
        { term: "starts with", op: "startsWith" },
        { term: "ends with", op: "endsWith" }
      ];
      
      for (const { term, op } of comparisonTerms) {
        if (promptLower.includes(term)) {
          operation = op;
          
          const termIndex = promptLower.indexOf(term);
          const afterTerm = prompt.slice(termIndex + term.length).trim();
          
          const numberMatch = afterTerm.match(/^[\s]*([0-9.]+)/);
          const stringMatch = afterTerm.match(/^[\s]*['"]([^'"]+)['"]/);
          const wordMatch = afterTerm.match(/^[\s]*([^\s.,?!]+)/);
          
          if (numberMatch) {
            comparisonValue = parseFloat(numberMatch[1]);
          } else if (stringMatch) {
            comparisonValue = stringMatch[1];
          } else if (wordMatch) {
            comparisonValue = wordMatch[1];
          }
          
          break;
        }
      }
      
      if (operation && comparisonValue !== null) {
        let filteredRows = [];
        
        switch(operation) {
          case ">":
            filteredRows = fileData.data.filter(row => {
              const val = parseFloat(row[targetColumn!]);
              return !isNaN(val) && val > (comparisonValue as number);
            });
            break;
          case "<":
            filteredRows = fileData.data.filter(row => {
              const val = parseFloat(row[targetColumn!]);
              return !isNaN(val) && val < (comparisonValue as number);
            });
            break;
          case "=":
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase() === String(comparisonValue).toLowerCase()
            );
            break;
          case "contains":
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase().includes(String(comparisonValue).toLowerCase())
            );
            break;
          case "startsWith":
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase().startsWith(String(comparisonValue).toLowerCase())
            );
            break;
          case "endsWith":
            filteredRows = fileData.data.filter(row => 
              String(row[targetColumn!]).toLowerCase().endsWith(String(comparisonValue).toLowerCase())
            );
            break;
        }
        
        if (filteredRows.length > 0) {
          const operationText = operation === ">" ? "greater than" : 
                               operation === "<" ? "less than" :
                               operation === "=" ? "equal to" :
                               operation;
          
          let response = `Found ${filteredRows.length} rows where ${targetColumn} is ${operationText} ${comparisonValue}.\n\n`;
          
          if (filteredRows.length <= 3) {
            response += `Here are all the matching rows:\n\`\`\`\n${JSON.stringify(filteredRows, null, 2)}\n\`\`\``;
          } else {
            response += `Here are the first 3 matching rows:\n\`\`\`\n${JSON.stringify(filteredRows.slice(0, 3), null, 2)}\n\`\`\``;
          }
          
          return response;
        } else {
          return `No rows found where ${targetColumn} is ${operation} ${comparisonValue}.`;
        }
      }
      
      const valueCounts: {[key: string]: number} = {};
      fileData.data.forEach(row => {
        const val = row[targetColumn!] || "(empty)";
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });
      
      const topValues = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1]);
        
      let response = `Here's the distribution of values in column "${targetColumn}" from dataset "${fileData.name}":\n\n`;
      
      const valuesToShow = topValues.length <= 10 ? topValues : topValues.slice(0, 10);
      response += valuesToShow.map(([val, count]) => `- "${val}": ${count} rows (${(count/fileData.data.length*100).toFixed(1)}%)`).join('\n');
      
      if (topValues.length > 10) {
        response += `\n\n...and ${topValues.length - 10} more unique values.`;
      }
      
      return response;
    }
    
    return `The dataset "${fileData.name}" has ${fileData.data.length} rows and ${columnNames.length} columns. To filter or count specific values, please specify a column name in your question. Available columns are: ${columnNames.join(", ")}`;
  }
  
  if (promptLower.includes("chart") || promptLower.includes("plot") || promptLower.includes("graph") || 
      promptLower.includes("visualization") || promptLower.includes("visualize")) {
    const numericColumns = fileData.columns.filter(col => 
      fileData.data.some(row => !isNaN(parseFloat(row[col])))
    );
    
    const categoricalColumns = fileData.columns.filter(col => {
      const uniqueValues = new Set(fileData.data.map(row => row[col]));
      return uniqueValues.size < Math.min(fileData.data.length / 5, 20);
    });
    
    let requestedColumns = [];
    for (const col of fileData.columns) {
      if (promptLower.includes(col.toLowerCase())) {
        requestedColumns.push(col);
      }
    }
    
    if (requestedColumns.length > 0) {
      const requestedNumeric = requestedColumns.filter(col => numericColumns.includes(col));
      const requestedCategorical = requestedColumns.filter(col => categoricalColumns.includes(col));
      
      if (requestedNumeric.length > 0 && requestedCategorical.length > 0) {
        return `For visualizing the relationship between "${requestedCategorical[0]}" and "${requestedNumeric[0]}" in dataset "${fileData.name}", I recommend:\n\n` +
          `1. **Bar Chart**: Use "${requestedCategorical[0]}" on x-axis and "${requestedNumeric[0]}" on y-axis to compare values across categories.\n` +
          `2. **Box Plot**: This would show the distribution of "${requestedNumeric[0]}" for each value of "${requestedCategorical[0]}".\n\n` +
          `Here's a sample of the data to help you understand the relationship:\n\`\`\`\n${
            JSON.stringify(fileData.data.slice(0, 3).map(row => ({
              [requestedCategorical[0]]: row[requestedCategorical[0]],
              [requestedNumeric[0]]: row[requestedNumeric[0]]
            })), null, 2)
          }\n\`\`\``;
      } else if (requestedNumeric.length > 1) {
        return `For visualizing the relationship between "${requestedNumeric[0]}" and "${requestedNumeric[1]}" in dataset "${fileData.name}", I recommend:\n\n` +
          `1. **Scatter Plot**: This will show if there's any correlation between the two numerical variables.\n` +
          `2. **Line Chart**: If the data has a time component or natural ordering.\n\n` +
          `Here's a sample of the data to help you understand the relationship:\n\`\`\`\n${
            JSON.stringify(fileData.data.slice(0, 3).map(row => ({
              [requestedNumeric[0]]: row[requestedNumeric[0]],
              [requestedNumeric[1]]: row[requestedNumeric[1]]
            })), null, 2)
          }\n\`\`\``;
      } else if (requestedCategorical.length > 0) {
        return `For visualizing the distribution of "${requestedCategorical[0]}" in dataset "${fileData.name}", I recommend:\n\n` +
          `1. **Pie Chart**: Shows the proportion of each category.\n` +
          `2. **Bar Chart**: Shows the count or frequency of each category.\n\n` +
          `Here's the distribution of values:\n\`\`\`\n${
            JSON.stringify(
              Object.entries(
                fileData.data.reduce((counts: {[key: string]: number}, row) => {
                  const val = row[requestedCategorical[0]] || "(empty)";
                  counts[val] = (counts[val] || 0) + 1;
                  return counts;
                }, {})
              ).sort((a, b) => b[1] - a[1]).slice(0, 10)
            )
          }\n\`\`\``;
      }
    }
    
    if (numericColumns.length > 0 && categoricalColumns.length > 0) {
      return `For data visualization of "${fileData.name}", I recommend:\n\n` +
        `1. **Bar chart**: Use "${categoricalColumns[0]}" on x-axis and "${numericColumns[0]}" on y-axis\n` + 
        `2. **Scatter plot**: Compare "${numericColumns[0]}" vs "${numericColumns.length > 1 ? numericColumns[1] : numericColumns[0]}"\n` +
        `3. **Pie chart**: Show the distribution of "${categoricalColumns[0]}"\n\n` +
        `Available columns for visualization:\n` +
        `- Numerical: ${numericColumns.join(", ")}\n` +
        `- Categorical: ${categoricalColumns.join(", ")}\n\n` +
        `For more specific visualizations, please ask about particular columns you're interested in.`;
    } else if (numericColumns.length > 0) {
      return `For dataset "${fileData.name}", I recommend visualizing the numerical columns:\n\n` +
        `1. **Histogram** for "${numericColumns[0]}": Shows the distribution of values\n` +
        `2. **Line chart**: Good if your data has a time or sequential component\n` +
        `3. **Box plot**: Shows the median, quartiles, and outliers\n\n` +
        `Available numerical columns: ${numericColumns.join(", ")}`;
    } else if (categoricalColumns.length > 0) {
      return `For dataset "${fileData.name}", I recommend visualizing the categorical columns:\n\n` +
        `1. **Bar chart** for "${categoricalColumns[0]}": Shows the count of each category\n` +
        `2. **Pie chart**: Shows the proportion of each category\n` +
        `3. **Treemap**: Useful for hierarchical categorical data\n\n` +
        `Available categorical columns: ${categoricalColumns.join(", ")}`;
    }
    
    return `For data visualization of "${fileData.name}", I would need more information about what aspects of the data you want to visualize. The dataset contains ${fileData.data.length} rows and columns: ${fileData.columns.join(", ")}`;
  }
  
  if (promptLower.includes("correlate") || promptLower.includes("relationship") || promptLower.includes("related") ||
      promptLower.includes("connection") || promptLower.includes("compare")) {
    
    let columnsToCompare = [];
    for (const col of fileData.columns) {
      if (promptLower.includes(col.toLowerCase())) {
        columnsToCompare.push(col);
      }
    }
    
    if (columnsToCompare.length >= 2) {
      let col1 = columnsToCompare[0];
      let col2 = columnsToCompare[1];
      
      const isCol1Numeric = fileData.data.some(row => !isNaN(parseFloat(row[col1])));
      const isCol2Numeric = fileData.data.some(row => !isNaN(parseFloat(row[col2])));
      
      if (isCol1Numeric && isCol2Numeric) {
        try {
          const validPairs = fileData.data
            .map(row => [parseFloat(row[col1]), parseFloat(row[col2])])
            .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
          
          if (validPairs.length < 5) {
            return `Not enough valid numeric pairs to calculate correlation between "${col1}" and "${col2}".`;
          }
          
          const mean1 = validPairs.reduce((sum, pair) => sum + pair[0], 0) / validPairs.length;
          const mean2 = validPairs.reduce((sum, pair) => sum + pair[1], 0) / validPairs.length;
          
          let numerator = 0;
          let denom1 = 0;
          let denom2 = 0;
          
          for (const [val1, val2] of validPairs) {
            const dev1 = val1 - mean1;
            const dev2 = val2 - mean2;
            numerator += dev1 * dev2;
            denom1 += dev1 * dev1;
            denom2 += dev2 * dev2;
          }
          
          const denomProduct = Math.sqrt(denom1) * Math.sqrt(denom2);
          const correlation = denomProduct !== 0 ? numerator / denomProduct : 0;
          
          let relationshipStrength;
          
          if (Math.abs(correlation) > 0.7) {
            relationshipStrength = "strong";
          } else if (Math.abs(correlation) > 0.3) {
            relationshipStrength = "moderate";
          } else {
            relationshipStrength = "weak";
          }
          
          let relationshipDirection = correlation > 0 ? "positive" : "negative";
          
          return `Analysis of relationship between "${col1}" and "${col2}" in dataset "${fileData.name}":\n\n` +
            `- Correlation coefficient: ${correlation.toFixed(4)}\n` +
            `- Interpretation: There is a ${relationshipStrength} ${relationshipDirection} correlation between the two variables.\n` +
            `- This means that ${relationshipDirection === "positive" ? "as one value increases, the other tends to increase as well" : "as one value increases, the other tends to decrease"}.\n\n` +
            `Sample data points:\n\`\`\`\n${
              JSON.stringify(
                fileData.data.slice(0, 5).map(row => ({
                  [col1]: row[col1],
                  [col2]: row[col2]
                })), null, 2
              )
            }\n\`\`\``;
        } catch (e) {
          return `Unable to calculate correlation between "${col1}" and "${col2}" due to an error. Please check that both columns contain valid numerical data.`;
        }
      } else {
        try {
          const contingencyTable: {[key: string]: {[key: string]: number}} = {};
          
          for (const row of fileData.data) {
            const val1 = String(row[col1] || "(empty)");
            const val2 = String(row[col2] || "(empty)");
            
            if (!contingencyTable[val1]) {
              contingencyTable[val1] = {};
            }
            
            if (!contingencyTable[val1][val2]) {
              contingencyTable[val1][val2] = 0;
            }
            
            contingencyTable[val1][val2]++;
          }
          
          const val1Categories = Object.keys(contingencyTable).slice(0, 5);
          const val2Categories = new Set<string>();
          
          for (const val1 of val1Categories) {
            for (const val2 of Object.keys(contingencyTable[val1])) {
              val2Categories.add(val2);
            }
          }
          
          const top5Val2 = Array.from(val2Categories).slice(0, 5);
          
          let response = `Relationship between "${col1}" and "${col2}" in dataset "${fileData.name}":\n\n`;
          response += "Contingency table (counts of occurrences):\n\n";
          
          // Create table header
          response += `| ${col1} \\ ${col2} | ${top5Val2.join(' | ')} |\n`;
          response += `| ${'---'.repeat(Math.max(1, Math.ceil(col1.length / 3)))} | ${top5Val2.map(val => '---'.repeat(Math.max(1, Math.ceil(String(val).length / 3)))).join(' | ')} |\n`;
          
          // Create table rows
          for (const val1 of val1Categories) {
            response += `| ${val1} | `;
            response += top5Val2.map(val2 => contingencyTable[val1][val2] || 0).join(' | ');
            response += ' |\n';
          }
          
          return response;
        } catch (e) {
          return `Unable to analyze relationship between "${col1}" and "${col2}" due to an error.`;
        }
      }
    }
    
    return `To analyze relationships, please specify two columns from your dataset. Available columns are: ${fileData.columns.join(", ")}`;
  }
  
  // Default response if no specific analysis is triggered
  return `I analyzed your data file "${fileData.name}" (${fileData.data.length} rows, ${fileData.columns.length} columns). To get insights, try asking specific questions about:
  
1. **Unique values**: "Show me all unique values in column X"
2. **Statistics**: "Give me summary statistics for this dataset"
3. **Filtering**: "Count rows where column X is greater than 10"
4. **Visualizations**: "Suggest charts for columns X and Y"
5. **Relationships**: "Is there a correlation between columns X and Y?"

Available columns: ${fileData.columns.join(", ")}`;
};

export const simulateAIResponse = async (prompt: string, fileData: FileData | null, model: AIModel, apiKey: string | null): Promise<string> => {
  // This is a placeholder for actual API integration
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  if (!fileData) {
    return "I don't see any data to analyze. Please select a file from the dropdown menu, or upload one using the upload tab.";
  }
  
  return `I've analyzed your dataset "${fileData.name}" which contains ${fileData.data.length} rows and ${fileData.columns.length} columns.

Based on your query: "${prompt}", here's what I found:

The dataset contains columns: ${fileData.columns.join(", ")}

Sample data (first 3 rows):
\`\`\`
${JSON.stringify(fileData.data.slice(0, 3), null, 2)}
\`\`\`

For more specific insights, try asking about particular columns or relationships between them.`;
};
