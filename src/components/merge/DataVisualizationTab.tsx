
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
  RadialBarChart,
  LabelList
} from 'recharts';

import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { useTheme } from "@/components/ui/use-theme";
import { generateChartColors } from "@/utils/colors";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";

interface DataVisualizationTabProps {
  files: FileData[];
  selectedFiles: FileData[];
  isProcessing: boolean;
  onComplete: (data: any[], updatedFiles?: FileData[], saveAsMergedFile?: boolean) => void;
}

type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "radar" | "radialBar";

const DataVisualizationTab: React.FC<DataVisualizationTabProps> = ({ files, selectedFiles, isProcessing, onComplete }) => {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xAxisKey, setXAxisKey] = useState<string | null>(null);
  const [yAxisKeys, setYAxisKeys] = useState<string[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isStacked, setIsStacked] = useState(false);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [isLegendVisible, setIsLegendVisible] = useState(true);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isAnimationActive, setIsAnimationActive] = useState(true);
  const [isDownloadEnabled, setIsDownloadEnabled] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<string>("default");
  const [isCustomPalette, setIsCustomPalette] = useState(false);
  const [customColorsInput, setCustomColorsInput] = useState<string>("");
  const [isLabelsVisible, setIsLabelsVisible] = useState(false);
  const [labelPosition, setLabelPosition] = useState<
    "top" | "inside" | "outside" | "insideStart" | "insideEnd" | "insideTop" | "insideBottom" | "insideLeft" | "insideRight" | "outsideStart" | "outsideEnd" | "outsideTop" | "outsideBottom" | "outsideLeft" | "outsideRight" | undefined
  >("top");
  const [labelFormatter, setLabelFormatter] = useState<string>("");
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);
  const [animationDuration, setAnimationDuration] = useState<number>(1500);
  const [animationEasing, setAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isTooltipActive, setIsTooltipActive] = useState(true);
  const [tooltipFormatter, setTooltipFormatter] = useState<string>("");
  const [isBrushEnabled, setIsBrushEnabled] = useState(false);
  const [brushType, setBrushType] = useState<"x" | "y" | "xy">("x");
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [zoomType, setZoomType] = useState<"x" | "y" | "xy">("x");
  const [isDotVisible, setIsDotVisible] = useState(true);
  const [dotType, setDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [dotSize, setDotSize] = useState<number>(5);
  const [isShapeCurved, setIsShapeCurved] = useState(true);
  const [curveType, setCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isAreaFilled, setIsAreaFilled] = useState(true);
  const [fillOpacity, setFillOpacity] = useState<number>(0.5);
  const [isRadarPolarGrid, setIsRadarPolarGrid] = useState(true);
  const [isRadarPolarAngleAxis, setIsRadarPolarAngleAxis] = useState(true);
  const [isRadarPolarRadiusAxis, setIsRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarBackgroundVisible, setIsRadialBarBackgroundVisible] = useState(true);
  const [radialBarStartAngle, setRadialBarStartAngle] = useState<number>(90);
  const [radialBarEndAngle, setRadialBarEndAngle] = useState<number>(-270);
  const [radialBarInnerRadius, setRadialBarInnerRadius] = useState<string>("10%");
  const [radialBarOuterRadius, setRadialBarOuterRadius] = useState<string>("80%");
  const [isRadialBarClockwise, setIsRadialBarClockwise] = useState(true);
  const [isRadialBarCornerRadius, setIsRadialBarCornerRadius] = useState(true);
  const [radialBarPaddingAngle, setRadialBarPaddingAngle] = useState<number>(2);
  const [isRadialBarLabelsVisible, setIsRadialBarLabelsVisible] = useState(false);
  const [radialBarLabelPosition, setRadialBarLabelPosition] = useState<
    "inside" | "outside" | "insideStart" | "insideEnd" | "insideTop" | "insideBottom" | "insideLeft" | "insideRight" | undefined
  >("inside");
  const [radialBarLabelFormatter, setRadialBarLabelFormatter] = useState<string>("");

  const getChartOptions = useCallback(() => {
    const baseOptions = {
      animation: isAnimationActive,
      animationDuration: animationDuration,
      animationEasing: animationEasing,
      tooltip: isTooltipActive,
      tooltipFormatter: tooltipFormatter,
      labels: isLabelsVisible,
      labelPosition: labelPosition,
      labelFormatter: labelFormatter,
      legend: isLegendVisible,
      grid: isGridVisible,
      colors: colorPalette.length > 0 ? colorPalette : undefined
    };

    switch (chartType) {
      case "bar":
        return {
          ...baseOptions,
          stacked: isStacked,
        };
      case "line":
        return {
          ...baseOptions,
          dots: isDotVisible,
          dotType: dotType,
          dotSize: dotSize,
          curved: isShapeCurved,
          curveType: curveType,
        };
      case "area":
        return {
          ...baseOptions,
          dots: isDotVisible,
          dotType: dotType,
          dotSize: dotSize,
          curved: isShapeCurved,
          curveType: curveType,
          filled: isAreaFilled,
          fillOpacity: fillOpacity,
          stacked: isStacked,
        };
      case "pie":
        return {
          ...baseOptions,
          innerRadius: 0,
          outerRadius: "80%",
          paddingAngle: 0,
        };
      case "scatter":
        return {
          ...baseOptions,
          dots: isDotVisible,
          dotType: dotType,
          dotSize: dotSize,
        };
      case "radar":
        return {
          ...baseOptions,
          polarGrid: isRadarPolarGrid,
          polarAngleAxis: isRadarPolarAngleAxis,
          polarRadiusAxis: isRadarPolarRadiusAxis,
        };
      case "radialBar":
        return {
          ...baseOptions,
          background: isRadialBarBackgroundVisible,
          startAngle: radialBarStartAngle,
          endAngle: radialBarEndAngle,
          innerRadius: radialBarInnerRadius,
          outerRadius: radialBarOuterRadius,
          clockwise: isRadialBarClockwise,
          cornerRadius: isRadialBarCornerRadius,
          paddingAngle: radialBarPaddingAngle,
          radialLabels: isRadialBarLabelsVisible,
          radialLabelPosition: radialBarLabelPosition,
          radialLabelFormatter: radialBarLabelFormatter,
        };
      default:
        return baseOptions;
    }
  }, [
    chartType,
    isAnimationActive,
    animationDuration,
    animationEasing,
    isTooltipActive,
    tooltipFormatter,
    isLabelsVisible,
    labelPosition,
    labelFormatter,
    isLegendVisible,
    isGridVisible,
    colorPalette,
    isStacked,
    isDotVisible,
    dotType,
    dotSize,
    isShapeCurved,
    curveType,
    isAreaFilled,
    fillOpacity,
    isRadarPolarGrid,
    isRadarPolarAngleAxis,
    isRadarPolarRadiusAxis,
    isRadialBarBackgroundVisible,
    radialBarStartAngle,
    radialBarEndAngle,
    radialBarInnerRadius,
    radialBarOuterRadius,
    isRadialBarClockwise,
    isRadialBarCornerRadius,
    radialBarPaddingAngle,
    isRadialBarLabelsVisible,
    radialBarLabelPosition,
    radialBarLabelFormatter
  ]);

  const renderChart = () => {
    return <div className="text-center p-12">Chart rendering placeholder</div>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chart Configuration</CardTitle>
            <CardDescription>
              Select chart type and data options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Chart Type</Label>
              <ToggleGroup type="single" value={chartType} onValueChange={(value) => value && setChartType(value as ChartType)}>
                <ToggleGroupItem value="bar" aria-label="Bar Chart">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Bar
                </ToggleGroupItem>
                <ToggleGroupItem value="line" aria-label="Line Chart">
                  <LineChart className="h-4 w-4 mr-2" />
                  Line
                </ToggleGroupItem>
                <ToggleGroupItem value="pie" aria-label="Pie Chart">
                  <PieChart className="h-4 w-4 mr-2" />
                  Pie
                </ToggleGroupItem>
                <ToggleGroupItem value="area" aria-label="Area Chart">
                  <AreaChart className="h-4 w-4 mr-2" />
                  Area
                </ToggleGroupItem>
                <ToggleGroupItem value="scatter" aria-label="Scatter Chart">
                  <ScatterChart className="h-4 w-4 mr-2" />
                  Scatter
                </ToggleGroupItem>
                <ToggleGroupItem value="radar" aria-label="Radar Chart">
                  <Radar className="h-4 w-4 mr-2" />
                  Radar
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <Label>X-Axis Column</Label>
              <SearchableDropdown
                trigger={
                  <Button variant="outline" className="w-full justify-between">
                    {xAxisKey || "Select X-Axis Column"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                }
                options={availableKeys.map(key => ({ label: key, value: key }))}
                value={xAxisKey || ""}
                onSelect={setXAxisKey}
                placeholder="Select X-Axis Column"
                searchPlaceholder="Search columns..."
                align="start"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Y-Axis Columns</Label>
              <MultiSelect
                options={availableKeys.map(key => ({ label: key, value: key }))}
                selected={yAxisKeys}
                onChange={setYAxisKeys}
                placeholder="Select Y-Axis Columns"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Chart Title</Label>
              <Input 
                placeholder="Enter chart title" 
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visualization Options</CardTitle>
            <CardDescription>
              Customize appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="legend-toggle">Show Legend</Label>
              <Switch 
                id="legend-toggle"
                checked={isLegendVisible}
                onCheckedChange={setIsLegendVisible}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="grid-toggle">Show Grid</Label>
              <Switch 
                id="grid-toggle"
                checked={isGridVisible}
                onCheckedChange={setIsGridVisible}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="animation-toggle">Enable Animation</Label>
              <Switch 
                id="animation-toggle"
                checked={isAnimationActive}
                onCheckedChange={setIsAnimationActive}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="labels-toggle">Show Data Labels</Label>
              <Switch 
                id="labels-toggle"
                checked={isLabelsVisible}
                onCheckedChange={setIsLabelsVisible}
              />
            </div>

            {chartType !== "pie" && chartType !== "radialBar" && (
              <div className="flex items-center justify-between">
                <Label htmlFor="stacked-toggle">Stacked</Label>
                <Switch 
                  id="stacked-toggle"
                  checked={isStacked}
                  onCheckedChange={setIsStacked}
                  disabled={!["bar", "area"].includes(chartType)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Animation Duration (ms)</Label>
              <Slider
                value={[animationDuration]}
                min={0}
                max={3000}
                step={100}
                onValueChange={(value) => setAnimationDuration(value[0])}
                disabled={!isAnimationActive}
              />
              <div className="text-xs text-muted-foreground text-right">
                {animationDuration}ms
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {customTitle || "Chart Preview"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DataVisualizationTab;
