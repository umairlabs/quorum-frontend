import {
  Component,
  InputSignal,
  Signal,
  computed,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartPoint {
  x: number;            // 0 to 100 percentage X coordinate
  y: number;            // 0 to 100 percentage Y coordinate
  val: number;          // Raw numeric value
  formattedVal: string; // e.g. "$12.4K" or "+12.4%"
  label: string;        // e.g. "Jan", "Feb"
}

export interface ChartSeries {
  label: string;
  points: string;       // Legacy polyline points string, e.g. "0,20 10,18 ..."
  strokeClass: string;
  strokeColor: string;
  dashed: boolean;
  legendColor: string;
  legendDashed: boolean;
  values?: number[];
  parsedPoints?: ChartPoint[];
  areaPath?: string;
  linePath?: string;
  latestValueFormatted?: string;
}

export interface HoverTooltipData {
  label: string;
  xPct: number;
  items: {
    label: string;
    value: string;
    rawVal: number;
    color: string;
    dashed: boolean;
    yPct: number;
  }[];
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent {
  public readonly series: InputSignal<ChartSeries[]> = input<ChartSeries[]>([]);
  public readonly yLabels: InputSignal<string[]> = input<string[]>([]);
  public readonly xLabels: InputSignal<string[]> = input<string[]>([]);
  public readonly currencySymbol: InputSignal<string> = input<string>('$');
  public readonly gridLines: InputSignal<number> = input<number>(5);
  public readonly title: InputSignal<string> = input<string>('ASSET VALUE OVERVIEW');
  public readonly subtitle: InputSignal<string> = input<string>('Total Purchase Value vs Current Depreciated Value');

  // Active hover point index for crosshair & tooltip
  protected readonly activeHoverIndex = signal<number | null>(null);

  protected readonly gridLineRange: Signal<number[]> = computed(() =>
    Array.from({ length: this.gridLines() }, (_, i) => i)
  );

  // Enhanced Series with Smooth Bezier Splines, Area Paths, and End Badges
  protected readonly processedSeries = computed(() => {
    const rawSeries = this.series();
    const xLabs = this.xLabels();
    if (!rawSeries || rawSeries.length === 0) return [];

    return rawSeries.map((s, seriesIdx) => {
      // Parse points string into coordinate objects
      const pairs = (s.points || '').trim().split(/\s+/).filter(Boolean);
      const pointsList: ChartPoint[] = [];

      pairs.forEach((pair, idx) => {
        const [xStr, yStr] = pair.split(',');
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);

        if (!isNaN(x) && !isNaN(y)) {
          const rawVal = s.values?.[idx] ?? 0;
          const monthLabel = xLabs[idx] || '';
          const formattedVal = this.formatNumber(rawVal);

          pointsList.push({
            x,
            y,
            val: rawVal,
            formattedVal,
            label: monthLabel
          });
        }
      });

      // Construct Smooth Bezier Spline Path (Cubic Bezier curves)
      let linePath = '';
      let areaPath = '';

      if (pointsList.length > 0) {
        linePath = this.generateSmoothPath(pointsList);

        // Closed Area Path underneath the smooth curve (M x0,y0 C ... L xN,88 L x0,88 Z)
        const firstX = pointsList[0].x.toFixed(2);
        const lastX = pointsList[pointsList.length - 1].x.toFixed(2);
        areaPath = `${linePath} L ${lastX} 88 L ${firstX} 88 Z`;
      }

      // Latest value formatted string for badge callout
      const lastPoint = pointsList[pointsList.length - 1];
      const latestValueFormatted = lastPoint ? lastPoint.formattedVal : '';

      return {
        ...s,
        parsedPoints: pointsList,
        linePath,
        areaPath,
        latestPoint: lastPoint,
        latestValueFormatted,
        isPrimary: seriesIdx === 0 && !s.dashed
      };
    });
  });

  // Primary Series for Gradient Area Fill & Callout Badge
  protected readonly primarySeries = computed(() => {
    const list = this.processedSeries();
    return list.find((s) => s.isPrimary) || list[0] || null;
  });

  // Computed Hover Tooltip Data for active crosshair
  protected readonly activeTooltip = computed<HoverTooltipData | null>(() => {
    const idx = this.activeHoverIndex();
    if (idx === null || idx < 0) return null;

    const seriesList = this.processedSeries();
    if (seriesList.length === 0) return null;

    const monthLabel = this.xLabels()[idx] || `Point ${idx + 1}`;
    const items: HoverTooltipData['items'] = [];
    let xPct = 0;

    seriesList.forEach((s) => {
      const pt = s.parsedPoints?.[idx];
      if (pt) {
        xPct = pt.x;
        items.push({
          label: s.label,
          value: pt.formattedVal,
          rawVal: pt.val,
          color: s.dashed ? '#64748b' : (s.strokeColor || '#0f172a'),
          dashed: s.dashed,
          yPct: pt.y
        });
      }
    });

    return {
      label: monthLabel,
      xPct,
      items
    };
  });

  // Mouse Move Event Listener for Crosshair Tracking
  protected onChartMouseMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const pctX = (mouseX / rect.width) * 100;

    const totalPoints = this.xLabels().length;
    if (totalPoints <= 1) return;

    // Find closest index along X axis
    const stepPct = 100 / (totalPoints - 1 || 1);
    const closestIdx = Math.max(0, Math.min(totalPoints - 1, Math.round(pctX / stepPct)));

    this.activeHoverIndex.set(closestIdx);
  }

  protected onChartMouseLeave(): void {
    this.activeHoverIndex.set(null);
  }

  // Primary series stroke color — drives the dynamic gradient area fill
  protected readonly primaryStrokeColor = computed(() => {
    return this.primarySeries()?.strokeColor || '#0f172a';
  });

  // Tooltip top position — follows the average Y of hovered data points, clamped to a safe zone
  protected readonly tooltipTopPct = computed(() => {
    const tooltip = this.activeTooltip();
    if (!tooltip || tooltip.items.length === 0) return 20;
    const avgY = tooltip.items.reduce((sum, item) => sum + item.yPct, 0) / tooltip.items.length;
    return Math.max(8, Math.min(55, avgY - 18));
  });

  // Tooltip left position clamped so the tooltip card never clips the left or right edges
  protected readonly tooltipLeftPct = computed(() => {
    const tooltip = this.activeTooltip();
    if (!tooltip) return 50;
    return Math.max(16, Math.min(84, tooltip.xPct));
  });

  // Returns true only for labels that should be visible — thins out the X axis when data is dense
  protected shouldShowXLabel(index: number): boolean {
    const total = this.xLabels().length;
    if (total <= 7) return true;
    const step = Math.ceil(total / 6);
    return index % step === 0 || index === total - 1;
  }

  // Smooth Cubic Bezier Curve Path Generator
  private generateSmoothPath(points: ChartPoint[]): string {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      // Tension factor 0.16 for organic smooth curves
      const cp1x = p1.x + (p2.x - p0.x) * 0.16;
      const cp1y = p1.y + (p2.y - p0.y) * 0.16;
      const cp2x = p2.x - (p3.x - p1.x) * 0.16;
      const cp2y = p2.y - (p3.y - p1.y) * 0.16;

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return path;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }
}
