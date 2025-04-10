
/**
 * Generates a set of chart colors based on the selected palette
 */
export const generateChartColors = (
  palette: string = "default", 
  count: number = 10, 
  customColors?: string[]
): string[] => {
  // Predefined color palettes
  const palettes: Record<string, string[]> = {
    default: [
      "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe",
      "#00c49f", "#ffbb28", "#ff8042", "#a4de6c", "#d0ed57"
    ],
    pastel: [
      "#abd5bd", "#f8cdde", "#abc8e2", "#d6afb4", "#e8cf8c",
      "#a2a8d3", "#e5c1c5", "#b4dddf", "#c7ceea", "#f0e5d8"
    ],
    vibrant: [
      "#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33",
      "#33FFF5", "#F533FF", "#8a2be2", "#ff1493", "#00ced1"
    ],
    monochrome: [
      "#000000", "#333333", "#666666", "#999999", "#cccccc",
      "#222222", "#444444", "#777777", "#aaaaaa", "#eeeeee"
    ],
    rainbow: [
      "#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff",
      "#4b0082", "#8f00ff", "#ff00ff", "#ff1493", "#00ced1"
    ]
  };

  // Use custom colors if provided
  if (customColors && customColors.length > 0) {
    return customColors;
  }

  // Get the selected palette or default if not found
  const selectedPalette = palettes[palette] || palettes.default;

  // Generate the requested number of colors
  if (count <= selectedPalette.length) {
    return selectedPalette.slice(0, count);
  } else {
    // If more colors needed than in palette, repeat colors
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(selectedPalette[i % selectedPalette.length]);
    }
    return result;
  }
};
