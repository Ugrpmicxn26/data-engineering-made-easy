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
  const [radialBarInnerRadius, setRadialBarInnerRadius] = useState<number>("10%");
  const [radialBarOuterRadius, setRadialBarOuterRadius] = useState<number>("80%");
  const [isRadialBarClockwise, setIsRadialBarClockwise] = useState(true);
  const [isRadialBarCornerRadius, setIsRadialBarCornerRadius] = useState(true);
  const [radialBarPaddingAngle, setRadialBarPaddingAngle] = useState<number>(2);
  const [isRadialBarLabelsVisible, setIsRadialBarLabelsVisible] = useState(false);
  const [radialBarLabelPosition, setRadialBarLabelPosition] = useState<
    "inside" | "outside" | "insideStart" | "insideEnd" | "insideTop" | "insideBottom" | "insideLeft" | "insideRight" | undefined
  >("inside");
  const [radialBarLabelFormatter, setRadialBarLabelFormatter] = useState<string>("");
  const [isRadialBarLegendVisible, setIsRadialBarLegendVisible] = useState(true);
  const [radialBarLegendPosition, setRadialBarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarAnimationActive, setIsRadialBarAnimationActive] = useState(true);
  const [radialBarAnimationDuration, setRadialBarAnimationDuration] = useState<number>(1500);
  const [radialBarAnimationEasing, setRadialBarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarTooltipActive, setIsRadialBarTooltipActive] = useState(true);
  const [radialBarTooltipFormatter, setRadialBarTooltipFormatter] = useState<string>("");
  const [isRadialBarBrushEnabled, setIsRadialBarBrushEnabled] = useState(false);
  const [radialBarBrushType, setRadialBarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarZoomEnabled, setIsRadialBarZoomEnabled] = useState(false);
  const [radialBarZoomType, setRadialBarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarDotVisible, setIsRadialBarDotVisible] = useState(true);
  const [radialBarDotType, setRadialBarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarDotSize, setRadialBarDotSize] = useState<number>(5);
  const [isRadialBarShapeCurved, setIsRadialBarShapeCurved] = useState(true);
  const [radialBarCurveType, setRadialBarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarAreaFilled, setIsRadialBarAreaFilled] = useState(true);
  const [radialBarFillOpacity, setRadialBarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarPolarGrid, setIsRadialBarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarPolarAngleAxis, setIsRadialBarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarPolarRadiusAxis, setIsRadialBarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarLegendVisible, setIsRadialBarRadarLegendVisible] = useState(true);
  const [radialBarRadarLegendPosition, setRadialBarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarAnimationActive, setIsRadialBarRadarAnimationActive] = useState(true);
  const [radialBarRadarAnimationDuration, setRadialBarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarAnimationEasing, setRadialBarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarTooltipActive, setIsRadialBarRadarTooltipActive] = useState(true);
  const [radialBarRadarTooltipFormatter, setRadialBarRadarTooltipFormatter] = useState<string>("");
  const [isRadialBarRadarBrushEnabled, setIsRadialBarRadarBrushEnabled] = useState(false);
  const [radialBarRadarBrushType, setRadialBarRadarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarZoomEnabled, setIsRadialBarRadarZoomEnabled] = useState(false);
  const [radialBarRadarZoomType, setRadialBarRadarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarDotVisible, setIsRadialBarRadarDotVisible] = useState(true);
  const [radialBarRadarDotType, setRadialBarRadarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarRadarDotSize, setRadialBarRadarDotSize] = useState<number>(5);
  const [isRadialBarRadarShapeCurved, setIsRadialBarRadarShapeCurved] = useState(true);
  const [radialBarRadarCurveType, setRadialBarRadarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarRadarAreaFilled, setIsRadialBarRadarAreaFilled] = useState(true);
  const [radialBarRadarFillOpacity, setRadialBarRadarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarRadarPolarGrid, setIsRadialBarRadarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarRadarPolarAngleAxis, setIsRadialBarRadarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarRadarPolarRadiusAxis, setIsRadialBarRadarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarRadarLegendVisible, setIsRadialBarRadarRadarLegendVisible] = useState(true);
  const [radialBarRadarRadarLegendPosition, setRadialBarRadarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarRadarAnimationActive, setIsRadialBarRadarRadarAnimationActive] = useState(true);
  const [radialBarRadarRadarAnimationDuration, setRadialBarRadarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarRadarAnimationEasing, setRadialBarRadarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarRadarTooltipActive, setIsRadialBarRadarRadarTooltipActive] = useState(true);
  const [radialBarRadarRadarTooltipFormatter, setRadialBarRadarRadarTooltipFormatter] = useState<string>("");
  const [isRadialBarRadarRadarBrushEnabled, setIsRadialBarRadarRadarBrushEnabled] = useState(false);
  const [radialBarRadarRadarBrushType, setRadialBarRadarRadarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarZoomEnabled, setIsRadialBarRadarRadarZoomEnabled] = useState(false);
  const [radialBarRadarRadarZoomType, setRadialBarRadarRadarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarDotVisible, setIsRadialBarRadarRadarDotVisible] = useState(true);
  const [radialBarRadarRadarDotType, setRadialBarRadarRadarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarRadarRadarDotSize, setRadialBarRadarRadarDotSize] = useState<number>(5);
  const [isRadialBarRadarRadarShapeCurved, setIsRadialBarRadarRadarShapeCurved] = useState(true);
  const [radialBarRadarRadarCurveType, setRadialBarRadarRadarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarRadarRadarAreaFilled, setIsRadialBarRadarRadarAreaFilled] = useState(true);
  const [radialBarRadarRadarFillOpacity, setRadialBarRadarRadarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarRadarRadarPolarGrid, setIsRadialBarRadarRadarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarRadarRadarPolarAngleAxis, setIsRadialBarRadarRadarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarRadarRadarPolarRadiusAxis, setIsRadialBarRadarRadarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarRadarRadarLegendVisible, setIsRadialBarRadarRadarRadarLegendVisible] = useState(true);
  const [radialBarRadarRadarRadarLegendPosition, setRadialBarRadarRadarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarRadarRadarAnimationActive, setIsRadialBarRadarRadarRadarAnimationActive] = useState(true);
  const [radialBarRadarRadarRadarAnimationDuration, setRadialBarRadarRadarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarRadarRadarAnimationEasing, setRadialBarRadarRadarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarRadarRadarTooltipActive, setIsRadialBarRadarRadarRadarTooltipActive] = useState(true);
  const [radialBarRadarRadarRadarTooltipFormatter, setRadialBarRadarRadarRadarTooltipFormatter] = useState<string>("");
  const [isRadialBarRadarRadarRadarBrushEnabled, setIsRadialBarRadarRadarRadarBrushEnabled] = useState(false);
  const [radialBarRadarRadarRadarBrushType, setRadialBarRadarRadarRadarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarZoomEnabled, setIsRadialBarRadarRadarRadarZoomEnabled] = useState(false);
  const [radialBarRadarRadarRadarZoomType, setRadialBarRadarRadarRadarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarDotVisible, setIsRadialBarRadarRadarRadarDotVisible] = useState(true);
  const [radialBarRadarRadarRadarDotType, setRadialBarRadarRadarRadarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarRadarRadarRadarDotSize, setRadialBarRadarRadarRadarDotSize] = useState<number>(5);
  const [isRadialBarRadarRadarRadarShapeCurved, setIsRadialBarRadarRadarRadarShapeCurved] = useState(true);
  const [radialBarRadarRadarRadarCurveType, setRadialBarRadarRadarRadarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarRadarRadarRadarAreaFilled, setIsRadialBarRadarRadarRadarAreaFilled] = useState(true);
  const [radialBarRadarRadarRadarFillOpacity, setRadialBarRadarRadarRadarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarRadarRadarRadarPolarGrid, setIsRadialBarRadarRadarRadarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarRadarRadarRadarPolarAngleAxis, setIsRadialBarRadarRadarRadarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarPolarRadiusAxis, setIsRadialBarRadarRadarRadarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarLegendVisible, setIsRadialBarRadarRadarRadarRadarLegendVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarLegendPosition, setRadialBarRadarRadarRadarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarRadarRadarRadarAnimationActive, setIsRadialBarRadarRadarRadarRadarAnimationActive] = useState(true);
  const [radialBarRadarRadarRadarRadarAnimationDuration, setRadialBarRadarRadarRadarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarRadarRadarRadarAnimationEasing, setRadialBarRadarRadarRadarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarRadarRadarRadarTooltipActive, setIsRadialBarRadarRadarRadarRadarTooltipActive] = useState(true);
  const [radialBarRadarRadarRadarRadarTooltipFormatter, setRadialBarRadarRadarRadarRadarTooltipFormatter] = useState<string>("");
  const [isRadialBarRadarRadarRadarRadarBrushEnabled, setIsRadialBarRadarRadarRadarRadarBrushEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarBrushType, setRadialBarRadarRadarRadarRadarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarZoomEnabled, setIsRadialBarRadarRadarRadarRadarZoomEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarZoomType, setRadialBarRadarRadarRadarRadarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarDotVisible, setIsRadialBarRadarRadarRadarRadarDotVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarDotType, setRadialBarRadarRadarRadarRadarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarRadarRadarRadarRadarDotSize, setRadialBarRadarRadarRadarRadarDotSize] = useState<number>(5);
  const [isRadialBarRadarRadarRadarRadarShapeCurved, setIsRadialBarRadarRadarRadarRadarShapeCurved] = useState(true);
  const [radialBarRadarRadarRadarRadarCurveType, setRadialBarRadarRadarRadarRadarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarRadarRadarRadarRadarAreaFilled, setIsRadialBarRadarRadarRadarRadarAreaFilled] = useState(true);
  const [radialBarRadarRadarRadarRadarFillOpacity, setRadialBarRadarRadarRadarRadarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarRadarRadarRadarRadarPolarGrid, setIsRadialBarRadarRadarRadarRadarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarPolarAngleAxis, setIsRadialBarRadarRadarRadarRadarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarPolarRadiusAxis, setIsRadialBarRadarRadarRadarRadarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarLegendVisible, setIsRadialBarRadarRadarRadarRadarRadarLegendVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarLegendPosition, setRadialBarRadarRadarRadarRadarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarRadarRadarRadarRadarAnimationActive, setIsRadialBarRadarRadarRadarRadarRadarAnimationActive] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarAnimationDuration, setRadialBarRadarRadarRadarRadarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarRadarRadarRadarRadarAnimationEasing, setRadialBarRadarRadarRadarRadarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarRadarRadarRadarRadarTooltipActive, setIsRadialBarRadarRadarRadarRadarRadarTooltipActive] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarTooltipFormatter, setRadialBarRadarRadarRadarRadarRadarTooltipFormatter] = useState<string>("");
  const [isRadialBarRadarRadarRadarRadarRadarBrushEnabled, setIsRadialBarRadarRadarRadarRadarRadarBrushEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarRadarBrushType, setRadialBarRadarRadarRadarRadarRadarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarRadarZoomEnabled, setIsRadialBarRadarRadarRadarRadarRadarZoomEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarRadarZoomType, setRadialBarRadarRadarRadarRadarRadarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarRadarDotVisible, setIsRadialBarRadarRadarRadarRadarRadarDotVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarDotType, setRadialBarRadarRadarRadarRadarRadarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarRadarRadarRadarRadarRadarDotSize, setRadialBarRadarRadarRadarRadarRadarDotSize] = useState<number>(5);
  const [isRadialBarRadarRadarRadarRadarRadarShapeCurved, setIsRadialBarRadarRadarRadarRadarRadarShapeCurved] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarCurveType, setRadialBarRadarRadarRadarRadarRadarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarRadarRadarRadarRadarRadarAreaFilled, setIsRadialBarRadarRadarRadarRadarRadarAreaFilled] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarFillOpacity, setRadialBarRadarRadarRadarRadarRadarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarRadarRadarRadarRadarRadarPolarGrid, setIsRadialBarRadarRadarRadarRadarRadarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarPolarAngleAxis, setIsRadialBarRadarRadarRadarRadarRadarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarPolarRadiusAxis, setIsRadialBarRadarRadarRadarRadarRadarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarLegendVisible, setIsRadialBarRadarRadarRadarRadarRadarRadarLegendVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarLegendPosition, setRadialBarRadarRadarRadarRadarRadarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarRadarRadarRadarRadarRadarAnimationActive, setIsRadialBarRadarRadarRadarRadarRadarRadarAnimationActive] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarAnimationDuration, setRadialBarRadarRadarRadarRadarRadarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarRadarRadarRadarRadarRadarAnimationEasing, setRadialBarRadarRadarRadarRadarRadarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarRadarRadarRadarRadarRadarTooltipActive, setIsRadialBarRadarRadarRadarRadarRadarRadarTooltipActive] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarTooltipFormatter, setRadialBarRadarRadarRadarRadarRadarRadarTooltipFormatter] = useState<string>("");
  const [isRadialBarRadarRadarRadarRadarRadarRadarBrushEnabled, setIsRadialBarRadarRadarRadarRadarRadarRadarBrushEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarRadarRadarBrushType, setRadialBarRadarRadarRadarRadarRadarRadarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarRadarRadarZoomEnabled, setIsRadialBarRadarRadarRadarRadarRadarRadarZoomEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarRadarRadarZoomType, setRadialBarRadarRadarRadarRadarRadarRadarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarRadarRadarDotVisible, setIsRadialBarRadarRadarRadarRadarRadarRadarDotVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarDotType, setRadialBarRadarRadarRadarRadarRadarRadarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarRadarRadarRadarRadarRadarRadarDotSize, setRadialBarRadarRadarRadarRadarRadarRadarDotSize] = useState<number>(5);
  const [isRadialBarRadarRadarRadarRadarRadarRadarShapeCurved, setIsRadialBarRadarRadarRadarRadarRadarRadarShapeCurved] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarCurveType, setRadialBarRadarRadarRadarRadarRadarRadarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarRadarRadarRadarRadarRadarRadarAreaFilled, setIsRadialBarRadarRadarRadarRadarRadarRadarAreaFilled] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarFillOpacity, setRadialBarRadarRadarRadarRadarRadarRadarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarPolarGrid, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarPolarAngleAxis, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarPolarRadiusAxis, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarLegendVisible, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarLegendVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarLegendPosition, setRadialBarRadarRadarRadarRadarRadarRadarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarAnimationActive, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarAnimationActive] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarAnimationDuration, setRadialBarRadarRadarRadarRadarRadarRadarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarAnimationEasing, setRadialBarRadarRadarRadarRadarRadarRadarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarTooltipActive, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarTooltipActive] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarTooltipFormatter, setRadialBarRadarRadarRadarRadarRadarRadarRadarTooltipFormatter] = useState<string>("");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarBrushEnabled, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarBrushEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarBrushType, setRadialBarRadarRadarRadarRadarRadarRadarRadarBrushType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarZoomEnabled, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarZoomEnabled] = useState(false);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarZoomType, setRadialBarRadarRadarRadarRadarRadarRadarRadarZoomType] = useState<"x" | "y" | "xy">("x");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarDotVisible, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarDotVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarDotType, setRadialBarRadarRadarRadarRadarRadarRadarRadarDotType] = useState<"circle" | "square" | "triangle" | "star">("circle");
  const [radialBarRadarRadarRadarRadarRadarRadarRadarDotSize, setRadialBarRadarRadarRadarRadarRadarRadarRadarDotSize] = useState<number>(5);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarShapeCurved, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarShapeCurved] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarCurveType, setRadialBarRadarRadarRadarRadarRadarRadarRadarCurveType] = useState<
    "natural" | "monotone" | "linear" | "step" | "stepBefore" | "stepAfter" | "cardinal" | "catmullRom"
  >("natural");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarAreaFilled, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarAreaFilled] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarFillOpacity, setRadialBarRadarRadarRadarRadarRadarRadarRadarFillOpacity] = useState<number>(0.5);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarRadarPolarGrid, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarRadarPolarGrid] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarRadarPolarAngleAxis, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarRadarPolarAngleAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarRadarPolarRadiusAxis, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarRadarPolarRadiusAxis] = useState(true);
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarRadarLegendVisible, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarRadarLegendVisible] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarRadarLegendPosition, setRadialBarRadarRadarRadarRadarRadarRadarRadarRadarLegendPosition] = useState<
    "top" | "bottom" | "left" | "right" | "inside" | undefined
  >("bottom");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarRadarAnimationActive, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarRadarAnimationActive] = useState(true);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarRadarAnimationDuration, setRadialBarRadarRadarRadarRadarRadarRadarRadarRadarAnimationDuration] = useState<number>(1500);
  const [radialBarRadarRadarRadarRadarRadarRadarRadarRadarAnimationEasing, setRadialBarRadarRadarRadarRadarRadarRadarRadarRadarAnimationEasing] = useState<
    "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "step" | "step-before" | "step-after"
  >("ease");
  const [isRadialBarRadarRadarRadarRadarRadarRadarRadarRadarTooltipActive, setIsRadialBarRadarRadarRadarRadarRadarRadarRadarRadarTooltipActive] = useState(
