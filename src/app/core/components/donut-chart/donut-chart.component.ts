import { Component, input, computed, signal, InputSignal, Signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutSegment {
  label: string;
  percentage: number;
  color: string;       // Tailwind bg-* class, e.g. 'bg-primary'
  hexColor: string;    // Hex value for SVG fill, e.g. '#1e293b'
}

export interface RenderedSegment {
  label: string;
  percentage: number;
  displayPercentage: string;
  hexColor: string;
  path: string;
  startAngle: number;
  endAngle: number;
  isSingle: boolean;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './donut-chart.component.html',
  styleUrls: ['./donut-chart.component.scss']
})
export class DonutChartComponent {
  public readonly segments: InputSignal<DonutSegment[]> = input<DonutSegment[]>([]);
  public readonly centerValue: InputSignal<string> = input<string>('');
  public readonly centerLabel: InputSignal<string> = input<string>('Total');
  public readonly startAngle: InputSignal<number> = input<number>(290);

  protected readonly hoveredIndex: WritableSignal<number | null> = signal<number | null>(null);

  // SVG Geometry constants
  private readonly cx: number = 160;
  private readonly cy: number = 160;
  private readonly rOut: number = 125;
  private readonly rIn: number = 65;

  // Fallback palette matching modern design tokens
  private readonly fallbackColors: string[] = [
    '#FF1E6A',
    '#0B0D12',
    '#8F9CAE',
    '#DDE2EB',
    '#3B82F6',
    '#10B981'
  ];

  protected readonly renderedSegments: Signal<RenderedSegment[]> = computed(() => {
    const rawSegs = this.segments().filter((seg) => seg.percentage > 0);
    if (!rawSegs || rawSegs.length === 0) {
      return [];
    }

    const totalPct = rawSegs.reduce((sum, seg) => sum + seg.percentage, 0);
    if (totalPct <= 0) {
      return [];
    }

    // Special case: Only 1 segment with data
    if (rawSegs.length === 1) {
      const seg = rawSegs[0];
      const hexColor = seg.hexColor || this.fallbackColors[0];
      const fullRingPath =
        `M ${this.cx} ${this.cy - this.rOut} ` +
        `A ${this.rOut} ${this.rOut} 0 1 0 ${this.cx} ${this.cy + this.rOut} ` +
        `A ${this.rOut} ${this.rOut} 0 1 0 ${this.cx} ${this.cy - this.rOut} ` +
        `M ${this.cx} ${this.cy - this.rIn} ` +
        `A ${this.rIn} ${this.rIn} 0 1 1 ${this.cx} ${this.cy + this.rIn} ` +
        `A ${this.rIn} ${this.rIn} 0 1 1 ${this.cx} ${this.cy - this.rIn} Z`;

      return [
        {
          label: seg.label,
          percentage: seg.percentage,
          displayPercentage: `${Math.round(seg.percentage)}%`,
          hexColor,
          path: fullRingPath,
          startAngle: 0,
          endAngle: 360,
          isSingle: true
        }
      ];
    }

    // Multiple segments: generate interlocking swirl paths
    let currentAngle = this.startAngle() % 360;
    const result: RenderedSegment[] = [];

    for (let i = 0; i < rawSegs.length; i++) {
      const seg = rawSegs[i];
      const normalizedPct = (seg.percentage / totalPct) * 100;
      const span = (normalizedPct / 100) * 360;

      const segStart = currentAngle;
      const segEnd = (currentAngle + span) % 360;

      const hexColor = seg.hexColor || this.fallbackColors[i % this.fallbackColors.length];
      const path = this.buildSwirlPath(this.cx, this.cy, this.rOut, this.rIn, segStart, segEnd);

      result.push({
        label: seg.label,
        percentage: seg.percentage,
        displayPercentage: `${Math.round(seg.percentage)}%`,
        hexColor,
        path,
        startAngle: segStart,
        endAngle: segEnd,
        isSingle: false
      });

      currentAngle = (currentAngle + span) % 360;
    }

    return result;
  });

  protected readonly hoveredSegment: Signal<RenderedSegment | null> = computed(() => {
    const idx = this.hoveredIndex();
    const segs = this.renderedSegments();
    if (idx === null || idx < 0 || idx >= segs.length) {
      return null;
    }
    return segs[idx];
  });

  protected onSegmentHover(index: number): void {
    this.hoveredIndex.set(index);
  }

  protected onSegmentLeave(): void {
    this.hoveredIndex.set(null);
  }

  /**
   * Converts polar coordinates (radius, angleDeg measured clockwise from 12 o'clock)
   * to cartesian (x, y) coordinates.
   */
  private polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: +(cx + r * Math.cos(rad)).toFixed(2),
      y: +(cy + r * Math.sin(rad)).toFixed(2)
    };
  }

  /**
   * Constructs an interlocking swirl segment SVG path with:
   * - Outer circular arc
   * - Convex semicircle cap at end (bulging clockwise into next segment)
   * - Inner circular arc (returning counter-clockwise)
   * - Concave semicircle notch at start (receding to accommodate previous segment's cap)
   */
  private buildSwirlPath(
    cx: number,
    cy: number,
    rOut: number,
    rIn: number,
    startAngle: number,
    endAngle: number
  ): string {
    const rCap = (rOut - rIn) / 2;
    const pOutStart = this.polarToCartesian(cx, cy, rOut, startAngle);
    const pOutEnd = this.polarToCartesian(cx, cy, rOut, endAngle);
    const pInEnd = this.polarToCartesian(cx, cy, rIn, endAngle);
    const pInStart = this.polarToCartesian(cx, cy, rIn, startAngle);

    let angleDiff = (endAngle - startAngle) % 360;
    if (angleDiff <= 0) {
      angleDiff += 360;
    }
    // Prevent numerical degeneracy on exact 180-degree arcs
    if (Math.abs(angleDiff - 180) < 0.05) {
      angleDiff = 179.95;
    }
    const largeArc = angleDiff > 180 ? 1 : 0;

    return (
      `M ${pOutStart.x} ${pOutStart.y} ` +
      `A ${rOut} ${rOut} 0 ${largeArc} 1 ${pOutEnd.x} ${pOutEnd.y} ` +
      `A ${rCap} ${rCap} 0 0 1 ${pInEnd.x} ${pInEnd.y} ` +
      `A ${rIn} ${rIn} 0 ${largeArc} 0 ${pInStart.x} ${pInStart.y} ` +
      `A ${rCap} ${rCap} 0 0 0 ${pOutStart.x} ${pOutStart.y} Z`
    );
  }
}
