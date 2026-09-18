import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Maximize2 } from 'lucide-react';
import { CalculatedCandle, TradeRecord, Position } from '../types/market';
import { formatExactPrice, formatAxisPrice } from '../utils/formatters';

export interface KlineChartHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  autoFit: () => void;
  resetView: () => void;
}

export interface KlineChartProps {
  candles: CalculatedCandle[];
  trades?: TradeRecord[];
  positions?: Position[];
  onHoverCandle?: (candle: CalculatedCandle | null) => void;
  replayIndex?: number; // Up to which candle to reveal (for backtest replay)
  flashTimestamp?: number; // The timestamp of the feature K to flash
  flashTriggerId?: number; // Unique ID to re-trigger the flash animation
  featureKTimestamps?: Set<number>; // Timestamps of all feature K-lines to permanently mark with yellow frame
}

export const KlineChart = forwardRef<KlineChartHandle, KlineChartProps>(({
  candles,
  trades = [],
  positions = [],
  onHoverCandle,
  replayIndex,
  flashTimestamp,
  flashTriggerId,
  featureKTimestamps,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Flash animation state refs
  const flashAlphaRef = useRef<number>(0);
  const flashAnimRef = useRef<number>(0);

  // Viewport state
  const [candleWidth, setCandleWidth] = useState<number>(14); // Width per candle
  const [candleGap, setCandleGap] = useState<number>(4); // Gap between candles
  const [scrollOffset, setScrollOffset] = useState<number>(0); // Negative or positive offset in candles
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  // Auto-fit mode: automatically fits visible candles to container width and resolution
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);

  // Determine active slice of candles based on replay index
  const effectiveCandles = React.useMemo(() => {
    if (replayIndex !== undefined && replayIndex >= 0 && replayIndex < candles.length) {
      return candles.slice(0, replayIndex + 1);
    }
    return candles;
  }, [candles, replayIndex]);

  // Keep latest candle in view when replay advances
  useEffect(() => {
    if (replayIndex !== undefined && effectiveCandles.length > 0) {
      setScrollOffset(0);
    }
  }, [replayIndex, effectiveCandles.length]);

  // Adaptive dimension calculation based on container resolution & candle count
  const calculateOptimalDimensions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const priceScaleWidth = 140;
    const chartWidth = rect.width - priceScaleWidth;
    if (chartWidth <= 0) return;

    const count = effectiveCandles.length;
    if (count === 0) {
      setCandleWidth(14);
      setCandleGap(4);
      return;
    }

    if (count <= 50) {
      // Small number of bars (e.g. initial backtest / early replay or newly listed coin)
      // Adaptively scale so bars span comfortably across the screen width with clear bodies
      const availableWidth = Math.max(100, chartWidth - 80);
      const targetStep = Math.min(50, Math.max(14, Math.floor(availableWidth / Math.max(1, count))));
      const newCandleWidth = Math.max(6, Math.round(targetStep * 0.72));
      const newCandleGap = Math.max(2, targetStep - newCandleWidth);
      setCandleWidth(newCandleWidth);
      setCandleGap(newCandleGap);
      setScrollOffset(0);
    } else {
      // Normal / large number of bars: calculate optimal bar density for the screen resolution
      // Target comfortable visible bars (e.g. 55-85 depending on screen width)
      const comfortableCount = Math.min(count, Math.max(45, Math.round(chartWidth / 20)));
      const targetStep = Math.max(7, Math.min(30, Math.floor((chartWidth - 50) / comfortableCount)));
      const newCandleWidth = Math.max(4, Math.round(targetStep * 0.74));
      const newCandleGap = Math.max(1, targetStep - newCandleWidth);
      setCandleWidth(newCandleWidth);
      setCandleGap(newCandleGap);
    }
  }, [effectiveCandles.length]);

  // Handle Zoom In
  const handleZoomIn = useCallback(() => {
    setIsAutoFit(false);
    setCandleWidth((w) => Math.min(54, w + 3));
    setCandleGap((g) => Math.min(16, Math.max(2, Math.round(g * 1.25))));
  }, []);

  // Handle Zoom Out
  const handleZoomOut = useCallback(() => {
    setIsAutoFit(false);
    setCandleWidth((w) => Math.max(3, w - 3));
    setCandleGap((g) => Math.max(1, Math.round(g * 0.8)));
  }, []);

  // Handle Auto-Fit / Reset View
  const handleAutoFit = useCallback(() => {
    setIsAutoFit(true);
    setScrollOffset(0);
    calculateOptimalDimensions();
  }, [calculateOptimalDimensions]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    autoFit: handleAutoFit,
    resetView: handleAutoFit,
  }), [handleZoomIn, handleZoomOut, handleAutoFit]);

  // Auto-fit on candle count changes if auto-fit mode is active
  useEffect(() => {
    if (isAutoFit) {
      calculateOptimalDimensions();
    }
  }, [effectiveCandles.length, isAutoFit, calculateOptimalDimensions]);

  // Handle render loop on canvas
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Color theme matching screenshot
    const BG_COLOR = '#0a1017';
    const GRID_COLOR = '#162230';
    const TEXT_MUTED = '#64748b';
    const GREEN_COLOR = '#00C087';
    const RED_COLOR = '#F6465D';
    const MA7_COLOR = '#F59E0B';
    const MA25_COLOR = '#06B6D4';
    const MA99_COLOR = '#A855F7';

    // Clear background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    if (effectiveCandles.length === 0) {
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = '14px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无行情数据，请在顶部选择“行情数据”进行获取或导入', width / 2, height / 2);
      return;
    }

    // Layout dimensions
    const priceScaleWidth = 140;
    const timeScaleHeight = 24;
    const volumeHeight = Math.max(45, Math.min(85, height * 0.16));
    const mainChartHeight = height - timeScaleHeight - volumeHeight - 8;
    const chartWidth = width - priceScaleWidth;

    const leftPadding = 24;
    const rightPadding = 24;
    const availableWidth = Math.max(10, chartWidth - leftPadding - rightPadding);

    const step = candleWidth + candleGap;
    const maxVisibleCandles = Math.ceil(availableWidth / step) + 2;

    // Calculate start & end indices
    // scrollOffset = 0 means pinned to right edge
    const totalCount = effectiveCandles.length;
    let endIndex = totalCount - 1 - scrollOffset;
    if (endIndex >= totalCount) endIndex = totalCount - 1;
    if (endIndex < 0) endIndex = 0;

    let startIndex = Math.max(0, endIndex - maxVisibleCandles);

    const visibleCandles = effectiveCandles.slice(startIndex, endIndex + 1);
    if (visibleCandles.length === 0) return;

    const contentWidth = visibleCandles.length * step;

    // Find Price Min / Max in visible range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.ma7 && c.ma7 < minPrice) minPrice = c.ma7;
      if (c.ma7 && c.ma7 > maxPrice) maxPrice = c.ma7;
      if (c.ma25 && c.ma25 < minPrice) minPrice = c.ma25;
      if (c.ma25 && c.ma25 > maxPrice) maxPrice = c.ma25;
      if (c.ma99 && c.ma99 < minPrice) minPrice = c.ma99;
      if (c.ma99 && c.ma99 > maxPrice) maxPrice = c.ma99;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    if (minPrice === Infinity || maxPrice === -Infinity || minPrice === maxPrice) {
      minPrice = visibleCandles[0].low * 0.98;
      maxPrice = visibleCandles[0].high * 1.02;
    }

    // Add vertical padding (8%)
    const pricePadding = (maxPrice - minPrice) * 0.08;
    const yMin = minPrice - pricePadding;
    const yMax = maxPrice + pricePadding;
    const priceRange = yMax - yMin;

    const priceToY = (price: number) => {
      return mainChartHeight - ((price - yMin) / priceRange) * mainChartHeight + 10;
    };

    const yToPrice = (y: number) => {
      return yMax - ((y - 10) / mainChartHeight) * priceRange;
    };

    const volumeToY = (vol: number) => {
      const volMax = maxVolume > 0 ? maxVolume * 1.2 : 1;
      return height - timeScaleHeight - (vol / volMax) * volumeHeight;
    };

    // Calculate X coordinate for candle at index (relative to startIndex)
    // When fewer candles than available width and not scrolled, center with balanced margins
    // When filling the chart or scrolled, align from right edge
    const getCandleX = (idxInVisible: number) => {
      if (contentWidth < availableWidth && scrollOffset === 0) {
        const startX = leftPadding + (availableWidth - contentWidth) / 2 + step / 2;
        return startX + idxInVisible * step;
      }
      return chartWidth - rightPadding - step / 2 - (visibleCandles.length - 1 - idxInVisible) * step;
    };

    // 1. Draw horizontal price grid lines & labels
    const gridLinesCount = 6;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = GRID_COLOR;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLinesCount; i++) {
      const p = yMin + (priceRange / gridLinesCount) * i;
      const y = priceToY(p);

      // Grid line
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price text on right scale with adaptive precision
      ctx.fillText(formatAxisPrice(p, priceRange), width - 6, y);
    }
    ctx.setLineDash([]); // Reset line dash

    // 2. Draw vertical time grid lines & labels (strictly avoid label collisions regardless of resolution)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const minTimeLabelDistance = 90; // minimum pixels between time labels to guarantee zero overlap
    const timeLabelStep = Math.max(1, Math.ceil(minTimeLabelDistance / step));
    let lastLabelX = -Infinity;

    for (let i = 0; i < visibleCandles.length; i += timeLabelStep) {
      const c = visibleCandles[i];
      const x = getCandleX(i);

      if (x < 35 || x > chartWidth - 35) continue;
      if (x - lastLabelX < minTimeLabelDistance) continue;

      // Vertical line
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = '#141d27';
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, height - timeScaleHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Time label
      const d = new Date(c.timestamp);
      const timeStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.fillStyle = TEXT_MUTED;
      ctx.fillText(timeStr, x, height - timeScaleHeight + 5);
      lastLabelX = x;
    }

    // Border line between volume & time scale
    ctx.strokeStyle = '#182433';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - timeScaleHeight);
    ctx.lineTo(width, height - timeScaleHeight);
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();

    // 3. Draw Candlesticks & Volume
    visibleCandles.forEach((c, i) => {
      const x = getCandleX(i);
      const isUp = c.close >= c.open;
      const candleColor = isUp ? GREEN_COLOR : RED_COLOR;

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const topY = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

      // Draw Wicks
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, topY);
      ctx.moveTo(x, topY + bodyHeight);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw Candle Body
      ctx.fillStyle = candleColor;
      ctx.fillRect(x - candleWidth / 2, topY, candleWidth, bodyHeight);

      // Feature K Permanent Yellow Outer Frame (所有满足的特征K，在K线实体柱外圈标识一圈黄框并永久保留，以便回头看)
      const isFeatureK = featureKTimestamps ? featureKTimestamps.has(c.timestamp) : false;
      if (isFeatureK) {
        // 外圈留出 2px 间距，清晰环绕实体柱外圈形成明显黄框
        const borderPadding = 2;
        const boxX = x - candleWidth / 2 - borderPadding;
        const boxY = topY - borderPadding;
        const boxW = candleWidth + borderPadding * 2;
        const boxH = bodyHeight + borderPadding * 2;

        // 实体柱外圈醒目黄框 (#FFE600 纯正明亮黄色)
        ctx.strokeStyle = '#FFE600';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // 微弱柔和的金黄色底色，增强实体轮廓与辨识度
        ctx.fillStyle = 'rgba(255, 230, 0, 0.12)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }

      // If this candle is an in-progress incomplete bar (anti-leakage dynamic bar)
      if (c.isClosed === false) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(x - candleWidth / 2 - 1, topY - 1, candleWidth + 2, bodyHeight + 2);
        ctx.setLineDash([]);
      }

      // Draw Volume Bar
      const volY = volumeToY(c.volume);
      const volBase = height - timeScaleHeight;
      const volHeight = Math.max(1, volBase - volY);
      ctx.fillStyle = isUp ? 'rgba(0, 192, 135, 0.45)' : 'rgba(246, 70, 93, 0.45)';
      ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volHeight);

      // Feature K Flash Effect
      if (flashTimestamp && c.timestamp === flashTimestamp && flashAlphaRef.current > 0) {
        const alpha = flashAlphaRef.current;
        
        // Golden Glow Box
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.4})`;
        ctx.fillRect(x - candleWidth / 2 - 3, topY - 3, candleWidth + 6, bodyHeight + 6);
        
        // Golden Bright Border
        ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - candleWidth / 2 - 3, topY - 3, candleWidth + 6, bodyHeight + 6);
        
        // Vertical Glow Column Drop
        const grad = ctx.createLinearGradient(0, topY, 0, height - timeScaleHeight);
        grad.addColorStop(0, `rgba(251, 191, 36, ${alpha * 0.25})`);
        grad.addColorStop(1, `rgba(251, 191, 36, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x - candleWidth / 2 - 8, topY + bodyHeight + 3, candleWidth + 16, height - timeScaleHeight - (topY + bodyHeight + 3));
      }
    });

    // 4. Draw MA Indicator Curves
    const drawMALine = (key: 'ma7' | 'ma25' | 'ma99', color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;

      visibleCandles.forEach((c, i) => {
        const val = c[key];
        if (val !== undefined && !isNaN(val)) {
          const x = getCandleX(i);
          const y = priceToY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      if (started) ctx.stroke();
    };

    drawMALine('ma7', MA7_COLOR);
    drawMALine('ma25', MA25_COLOR);
    drawMALine('ma99', MA99_COLOR);

    // 5. Draw Trade Entry / Exit Markers
    const BRIGHT_YELLOW = '#FFE600'; // 亮黄色高亮标记

    trades.forEach((trade) => {
      // Check if entry in visible candles
      const entryIdx = visibleCandles.findIndex((c) => Math.abs(c.timestamp - trade.entryTime) < 60000);
      if (entryIdx !== -1) {
        const x = getCandleX(entryIdx);
        const y = priceToY(trade.entryPrice);

        ctx.fillStyle = trade.side === 'LONG' ? GREEN_COLOR : RED_COLOR;
        ctx.beginPath();
        if (trade.side === 'LONG') {
          // Green upward arrow below candle
          ctx.moveTo(x, y + 18);
          ctx.lineTo(x - 5, y + 26);
          ctx.lineTo(x + 5, y + 26);
        } else {
          // Red downward arrow above candle
          ctx.moveTo(x, y - 18);
          ctx.lineTo(x - 5, y - 26);
          ctx.lineTo(x + 5, y - 26);
        }
        ctx.closePath();
        ctx.fill();

        // Label: 买入 / 卖出 (字体改为亮黄色，尺寸调整为当前尺寸的2倍: 18px)
        ctx.fillStyle = BRIGHT_YELLOW;
        ctx.font = 'bold 18px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(
          trade.side === 'LONG' ? `B ${formatExactPrice(trade.entryPrice)}` : `S ${formatExactPrice(trade.entryPrice)}`,
          x,
          trade.side === 'LONG' ? y + 44 : y - 32
        );
        ctx.shadowBlur = 0;
      }

      // Check if exit in visible candles
      const exitIdx = visibleCandles.findIndex((c) => Math.abs(c.timestamp - trade.exitTime) < 60000);
      if (exitIdx !== -1) {
        const x = getCandleX(exitIdx);
        const y = priceToY(trade.exitPrice);

        const isWin = trade.pnl >= 0;
        ctx.fillStyle = isWin ? GREEN_COLOR : RED_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label: 平仓盈亏 (字体改为亮黄色，尺寸调整为当前尺寸的2倍: 18px)
        ctx.fillStyle = BRIGHT_YELLOW;
        ctx.font = 'bold 18px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${isWin ? '+' : ''}${trade.pnl.toFixed(1)}U`, x, y - 12);
        ctx.shadowBlur = 0;
      }
    });

    // 6. Draw Active Position Entry Line
    positions.forEach((pos) => {
      const y = priceToY(pos.entryPrice);
      ctx.strokeStyle = pos.side === 'LONG' ? GREEN_COLOR : RED_COLOR;
      ctx.setLineDash([4, 2]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge on right scale
      ctx.fillStyle = pos.side === 'LONG' ? GREEN_COLOR : RED_COLOR;
      ctx.fillRect(chartWidth + 1, y - 9, priceScaleWidth - 2, 18);
      ctx.fillStyle = '#0a1017';
      ctx.font = 'bold 10px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pos.side} ${formatExactPrice(pos.entryPrice)}`, chartWidth + priceScaleWidth / 2, y);
    });

    // 7. Latest Price Highlight Tag on Right Axis (Respect exact raw data)
    const latestCandle = effectiveCandles[effectiveCandles.length - 1];
    if (latestCandle) {
      const y = priceToY(latestCandle.close);
      const isUp = latestCandle.close >= latestCandle.open;
      const tagBg = isUp ? GREEN_COLOR : RED_COLOR;

      // Tag box on right scale
      ctx.fillStyle = tagBg;
      ctx.fillRect(chartWidth + 1, y - 16, priceScaleWidth - 2, 32);
      if (latestCandle.isClosed === false) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(chartWidth + 1, y - 16, priceScaleWidth - 2, 32);
      }
      ctx.fillStyle = '#060a0f';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatExactPrice(latestCandle.close), chartWidth + priceScaleWidth / 2, y);
    }

    // 8. Crosshair Cursor on Mouse Move
    if (hoverIndex !== null && hoverIndex >= startIndex && hoverIndex <= endIndex) {
      const idxInVisible = hoverIndex - startIndex;
      const crossX = getCandleX(idxInVisible);
      const crossY = hoverY !== null ? hoverY : priceToY(effectiveCandles[hoverIndex].close);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical cross line
      ctx.beginPath();
      ctx.moveTo(crossX, 0);
      ctx.lineTo(crossX, height - timeScaleHeight);
      ctx.stroke();

      // Horizontal cross line
      ctx.beginPath();
      ctx.moveTo(0, crossY);
      ctx.lineTo(chartWidth, crossY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price Tag on Right Axis at crosshair
      const crossPrice = yToPrice(crossY);
      
      let crossText = formatAxisPrice(crossPrice, priceRange);
      if (latestCandle && latestCandle.close) {
        const pctDiff = ((crossPrice - latestCandle.close) / latestCandle.close) * 100;
        const pctDiffStr = (pctDiff >= 0 ? '+' : '') + pctDiff.toFixed(2) + '%';
        crossText = `${crossText}  ${pctDiffStr}`;
      }

      ctx.fillStyle = '#334155';
      ctx.fillRect(chartWidth + 1, crossY - 16, priceScaleWidth - 2, 32);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(crossText, chartWidth + priceScaleWidth / 2, crossY);

      // Time Tag on Bottom Axis at crosshair
      const hoveredCandle = effectiveCandles[hoverIndex];
      if (hoveredCandle) {
        const d = new Date(hoveredCandle.timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const timeBadge = `${year}/${month}/${day} ${hours}:${minutes}`;
        ctx.fillStyle = '#334155';
        ctx.fillRect(crossX - 58, height - timeScaleHeight + 2, 116, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(timeBadge, crossX, height - timeScaleHeight + 11);
      }
    }
  }, [
    effectiveCandles,
    candleWidth,
    candleGap,
    scrollOffset,
    hoverIndex,
    hoverY,
    trades,
    positions,
    flashTimestamp,
    featureKTimestamps,
  ]);

  // Handle ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (isAutoFit) {
        calculateOptimalDimensions();
      }
      drawChart();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawChart, isAutoFit, calculateOptimalDimensions]);

  // Redraw when dependencies change
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Flash animation loop
  useEffect(() => {
    if (flashTriggerId && flashTimestamp) {
      const startTime = performance.now();
      const DURATION = 1500; // 1.5 seconds

      const animate = (time: number) => {
        const elapsed = time - startTime;
        if (elapsed < DURATION) {
          // Fade out ease (1 to 0)
          const p = elapsed / DURATION;
          flashAlphaRef.current = Math.max(0, 1 - Math.pow(p, 1.5));
          drawChart();
          flashAnimRef.current = requestAnimationFrame(animate);
        } else {
          flashAlphaRef.current = 0;
          drawChart();
        }
      };

      if (flashAnimRef.current) cancelAnimationFrame(flashAnimRef.current);
      flashAnimRef.current = requestAnimationFrame(animate);

      return () => {
        if (flashAnimRef.current) cancelAnimationFrame(flashAnimRef.current);
      };
    }
  }, [flashTriggerId, flashTimestamp, drawChart]);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const priceScaleWidth = 140;
    const chartWidth = rect.width - priceScaleWidth;
    const step = candleWidth + candleGap;

    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const candlesMoved = Math.round(deltaX / step);
      if (candlesMoved !== 0) {
        setIsAutoFit(false);
        setScrollOffset((prev) => {
          const next = prev + candlesMoved;
          return Math.max(0, Math.min(Math.max(0, effectiveCandles.length - 3), next));
        });
        setDragStartX(e.clientX);
      }
    }

    if (x >= 0 && x <= chartWidth && y >= 0 && y <= rect.height) {
      const leftPadding = 24;
      const rightPadding = 24;
      const availableWidth = Math.max(10, chartWidth - leftPadding - rightPadding);
      const totalCount = effectiveCandles.length;
      let endIndex = totalCount - 1 - scrollOffset;
      if (endIndex >= totalCount) endIndex = totalCount - 1;
      if (endIndex < 0) endIndex = 0;
      const maxVisibleCandles = Math.ceil(availableWidth / step) + 2;
      const startIndex = Math.max(0, endIndex - maxVisibleCandles);
      const visibleCandles = effectiveCandles.slice(startIndex, endIndex + 1);
      const contentWidth = visibleCandles.length * step;

      let foundIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < visibleCandles.length; i++) {
        let candleX = 0;
        if (contentWidth < availableWidth && scrollOffset === 0) {
          candleX = leftPadding + (availableWidth - contentWidth) / 2 + step / 2 + i * step;
        } else {
          candleX = chartWidth - rightPadding - step / 2 - (visibleCandles.length - 1 - i) * step;
        }

        const diff = Math.abs(x - candleX);
        if (diff < minDiff && diff <= Math.max(12, step * 0.75)) {
          minDiff = diff;
          foundIdx = startIndex + i;
        }
      }

      if (foundIdx !== -1 && foundIdx < effectiveCandles.length) {
        setHoverIndex(foundIdx);
        setHoverY(y);
        if (onHoverCandle) {
          onHoverCandle(effectiveCandles[foundIdx]);
        }
      } else {
        setHoverIndex(null);
        setHoverY(null);
        if (onHoverCandle) {
          onHoverCandle(null);
        }
      }
    } else {
      setHoverIndex(null);
      setHoverY(null);
      if (onHoverCandle) {
        onHoverCandle(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverIndex(null);
    setHoverY(null);
    if (onHoverCandle) {
      onHoverCandle(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsAutoFit(false);
    if (e.deltaY < 0) {
      // Zoom in
      setCandleWidth((w) => Math.min(54, w + 2));
      setCandleGap((g) => Math.min(16, g + 0.5));
    } else {
      // Zoom out
      setCandleWidth((w) => Math.max(3, w - 2));
      setCandleGap((g) => Math.max(1, g - 0.5));
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 bg-[#0a1017] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating Auto-Fit (自适应) Toggle Button on Bottom-Right */}
      <button
        type="button"
        onClick={handleAutoFit}
        title={isAutoFit ? '当前为自适应展示状态，点击刷新适配' : '开启K线全屏自适应展示 (Auto-Fit)'}
        className={`absolute bottom-8 right-[148px] z-10 px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-all shadow-md backdrop-blur-sm cursor-pointer ${
          isAutoFit
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-cyan-500/20 font-semibold'
            : 'bg-[#121c27]/85 text-slate-400 hover:text-slate-100 hover:bg-[#1a2736] border border-[#23354a]'
        }`}
      >
        <Maximize2 className={`w-3 h-3 ${isAutoFit ? 'text-cyan-400' : 'text-slate-400'}`} />
        <span>自适应</span>
      </button>
    </div>
  );
});
