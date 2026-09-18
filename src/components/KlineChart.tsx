import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CalculatedCandle, TradeRecord, Position } from '../types/market';
import { formatExactPrice, formatAxisPrice } from '../utils/formatters';

interface KlineChartProps {
  candles: CalculatedCandle[];
  trades?: TradeRecord[];
  positions?: Position[];
  onHoverCandle?: (candle: CalculatedCandle | null) => void;
  replayIndex?: number; // Up to which candle to reveal (for backtest replay)
  flashTimestamp?: number; // The timestamp of the feature K to flash
  flashTriggerId?: number; // Unique ID to re-trigger the flash animation
}

export const KlineChart: React.FC<KlineChartProps> = ({
  candles,
  trades = [],
  positions = [],
  onHoverCandle,
  replayIndex,
  flashTimestamp,
  flashTriggerId,
}) => {
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
      // Auto follow latest candle if near right edge
      setScrollOffset(0);
    }
  }, [replayIndex, effectiveCandles.length]);

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
    const timeScaleHeight = 26;
    const volumeHeight = Math.max(60, height * 0.18);
    const mainChartHeight = height - timeScaleHeight - volumeHeight - 10;
    const chartWidth = width - priceScaleWidth;

    const step = candleWidth + candleGap;
    const maxVisibleCandles = Math.ceil(chartWidth / step) + 2;

    // Calculate start & end indices
    // scrollOffset = 0 means pinned to right edge
    const totalCount = effectiveCandles.length;
    let endIndex = totalCount - 1 - scrollOffset;
    if (endIndex >= totalCount) endIndex = totalCount - 1;
    if (endIndex < 0) endIndex = 0;

    let startIndex = Math.max(0, endIndex - maxVisibleCandles);

    const visibleCandles = effectiveCandles.slice(startIndex, endIndex + 1);
    if (visibleCandles.length === 0) return;

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
      const volTop = height - timeScaleHeight - volumeHeight;
      return height - timeScaleHeight - (vol / volMax) * volumeHeight;
    };

    // Calculate X coordinate for candle at index (relative to startIndex)
    // The rightmost visible candle aligns at chartWidth - step/2
    const getCandleX = (idxInVisible: number) => {
      const rightPadding = 12;
      const totalVis = visibleCandles.length;
      return chartWidth - rightPadding - (totalVis - 1 - idxInVisible) * step;
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

    // 2. Draw vertical time grid lines & labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const timeLabelStep = Math.max(1, Math.floor(visibleCandles.length / 7));

    for (let i = 0; i < visibleCandles.length; i += timeLabelStep) {
      const c = visibleCandles[i];
      const x = getCandleX(i);

      if (x < 20 || x > chartWidth - 20) continue;

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
      ctx.fillText(timeStr, x, height - timeScaleHeight + 6);
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
  ]);

  // Handle ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      drawChart();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawChart]);

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
        setScrollOffset((prev) => {
          const next = prev + candlesMoved;
          return Math.max(0, Math.min(effectiveCandles.length - 10, next));
        });
        setDragStartX(e.clientX);
      }
    }

    if (x >= 0 && x <= chartWidth && y >= 0 && y <= rect.height) {
      // Find hovered candle in visible range
      const rightPadding = 12;
      const totalCount = effectiveCandles.length;
      let endIndex = totalCount - 1 - scrollOffset;
      if (endIndex >= totalCount) endIndex = totalCount - 1;

      const offsetFromRight = chartWidth - rightPadding - x;
      const indexFromRight = Math.round(offsetFromRight / step);
      const targetIdx = endIndex - indexFromRight;

      if (targetIdx >= 0 && targetIdx < effectiveCandles.length) {
        setHoverIndex(targetIdx);
        setHoverY(y);
        if (onHoverCandle) {
          onHoverCandle(effectiveCandles[targetIdx]);
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
    if (e.deltaY < 0) {
      // Zoom in
      setCandleWidth((w) => Math.min(48, w + 2));
      setCandleGap((g) => Math.min(12, g + 0.5));
    } else {
      // Zoom out
      setCandleWidth((w) => Math.max(3, w - 2));
      setCandleGap((g) => Math.max(1, g - 0.5));
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[420px] bg-[#0a1017] overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair block"
      />
    </div>
  );
};
