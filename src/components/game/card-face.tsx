import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { PriceGameCard, TrendGameCard, ActiveGameCard, PriceCardFaceData, PriceCardBackData } from './types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
// Import an icon for daily performance if desired, e.g., Info, BarChart2
// import { Info } from 'lucide-react'; 

interface CardFaceProps {
  card: ActiveGameCard;
  isBack: boolean;
  onSmaClick?: (smaPeriod: 50 | 200, smaValue: number, faceData: PriceCardFaceData) => void;
  onRangeContextClick?: (levelType: 'High' | 'Low', levelValue: number, faceData: PriceCardFaceData) => void;
  onOpenPriceClick?: (faceData: PriceCardFaceData) => void; 
  onGenerateDailyPerformanceSignal?: (faceData: PriceCardFaceData) => void; // NEW PROP
}

const formatMarketCap = (cap: number | null | undefined): string => {
  if (cap === null || cap === undefined) return 'N/A';
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
  return cap.toString();
};

const CardFace: React.FC<CardFaceProps> = ({ 
  card, 
  isBack, 
  onSmaClick, 
  onRangeContextClick, 
  onOpenPriceClick,
  onGenerateDailyPerformanceSignal // Destructure new prop
}) => {

  // Logging props (can be removed after debugging)
  if (isBack && card.type === 'price') {
    console.log("CardFace (Back): onSmaClick type:", typeof onSmaClick, ", onOpenPriceClick type:", typeof onOpenPriceClick);
  }
  if (!isBack && card.type === 'price') {
    console.log("CardFace (Front): onRangeContextClick type:", typeof onRangeContextClick, ", onGenerateDailyPerformanceSignal type:", typeof onGenerateDailyPerformanceSignal);
  }

  const handleBackFaceSmaInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    smaPeriod: 50 | 200, 
    smaValue: number | null | undefined,
    faceDataForSma: PriceCardFaceData 
  ) => {
    if (onSmaClick && smaValue !== null && smaValue !== undefined) {
      console.log(`CardFace: SMA ${smaPeriod}D clicked. Stopping prop.`);
      e.stopPropagation(); 
      onSmaClick(smaPeriod, smaValue, faceDataForSma);
    }
  };

  const handleFrontFaceRangeInteraction = (
    e: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>,
    levelType: 'High' | 'Low',
    levelValue: number | null | undefined,
    faceDataForRange: PriceCardFaceData
  ) => {
    if (onRangeContextClick && levelValue !== null && levelValue !== undefined) {
      console.log(`CardFace: Day ${levelType} clicked. Stopping prop.`);
      e.stopPropagation();
      onRangeContextClick(levelType, levelValue, faceDataForRange);
    }
  };

  const handleBackFaceOpenPriceInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    faceDataForOpen: PriceCardFaceData
  ) => {
    if (onOpenPriceClick && faceDataForOpen.dayOpen != null) {
      console.log(`CardFace: Open Price clicked. Stopping prop.`);
      e.stopPropagation();
      onOpenPriceClick(faceDataForOpen);
    }
  };

  const handleDailyPerformanceInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    faceDataForSignal: PriceCardFaceData
  ) => {
    if (onGenerateDailyPerformanceSignal) {
      console.log(`CardFace: Daily Performance area clicked. Stopping prop.`);
      e.stopPropagation();
      onGenerateDailyPerformanceSignal(faceDataForSignal);
    } 
  };

  const renderContent = () => {
    if (card.type === 'price') {
      const priceCard = card as PriceGameCard;
      const faceData = priceCard.faceData as PriceCardFaceData;
      const backData = priceCard.backData as PriceCardBackData;

      if (isBack) {
        // ... (Back face rendering - Open Price and SMAs are clickable)
        return (
          <>
            <CardHeader><CardTitle className="text-lg">{faceData.symbol} - Details</CardTitle><CardDescription>{backData.explanation || 'Market Data & Technicals'}</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className={cn("p-0.5 rounded-sm transition-colors relative z-10 pointer-events-auto", onOpenPriceClick && faceData.dayOpen != null ? "cursor-pointer hover:bg-muted/30 hover:text-primary" : "")} onClick={(e) => { if (onOpenPriceClick && faceData.dayOpen != null) handleBackFaceOpenPriceInteraction(e, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onOpenPriceClick && faceData.dayOpen != null) { handleBackFaceOpenPriceInteraction(e, faceData); } }} role={onOpenPriceClick && faceData.dayOpen != null ? "button" : undefined} tabIndex={onOpenPriceClick && faceData.dayOpen != null ? 0 : undefined}>
                  <span className="font-semibold">Open:</span> ${faceData.dayOpen?.toFixed(2) ?? 'N/A'}
                </div>
                <p><span className="font-semibold">Prev Close:</span> ${faceData.previousClose?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Day High:</span> ${faceData.dayHigh?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Day Low:</span> ${faceData.dayLow?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Volume:</span> {faceData.volume?.toLocaleString() ?? 'N/A'}</p>
                <p><span className="font-semibold">Market Cap:</span> {formatMarketCap(backData.marketCap)}</p>
                <div className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma50d != null ? "cursor-pointer hover:bg-muted/30 hover:text-primary" : "")} onClick={(e) => { if (onSmaClick && backData.sma50d != null) handleBackFaceSmaInteraction(e, 50, backData.sma50d, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSmaClick && backData.sma50d != null) { handleBackFaceSmaInteraction(e, 50, backData.sma50d, faceData); } }} role={onSmaClick && backData.sma50d != null ? "button" : undefined} tabIndex={onSmaClick && backData.sma50d != null ? 0 : undefined}><span className="font-semibold">50D SMA:</span> {backData.sma50d?.toFixed(2) ?? 'N/A'}</div>
                <div className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma200d != null ? "cursor-pointer hover:bg-muted/30 hover:text-primary" : "")} onClick={(e) => { if (onSmaClick && backData.sma200d != null) handleBackFaceSmaInteraction(e, 200, backData.sma200d, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSmaClick && backData.sma200d != null) { handleBackFaceSmaInteraction(e, 200, backData.sma200d, faceData); } }} role={onSmaClick && backData.sma200d != null ? "button" : undefined} tabIndex={onSmaClick && backData.sma200d != null ? 0 : undefined}><span className="font-semibold">200D SMA:</span> {backData.sma200d?.toFixed(2) ?? 'N/A'}</div>
              </div>
            </CardContent>
          </>
        );
      } else { // Front of Price Card
        const changePositive = faceData.dayChange !== null && faceData.dayChange !== undefined && faceData.dayChange >= 0;
        const baseChangeColor = faceData.dayChange === 0 ? 'text-muted-foreground' : changePositive ? 'text-green-600' : 'text-red-600';

        return (
          <>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div> <CardTitle className="text-2xl">{faceData.symbol}</CardTitle> <CardDescription>Live Quote</CardDescription> </div>
                <p className="text-xs text-muted-foreground"> {faceData.timestamp ? format(new Date(faceData.timestamp), 'p') : 'N/A'} </p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Clickable area for Daily Performance Signal */}
              <div 
                className={cn(
                  "group/dps rounded-md p-2 -mx-2 -my-1 mb-1", // Adjust padding/margin to define clickable area
                  onGenerateDailyPerformanceSignal ? "cursor-pointer hover:bg-muted/30 transition-colors pointer-events-auto relative z-10" : ""
                )}
                onClick={(e) => { if (onGenerateDailyPerformanceSignal) handleDailyPerformanceInteraction(e, faceData); }}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onGenerateDailyPerformanceSignal) { handleDailyPerformanceInteraction(e, faceData); } }}
                role={onGenerateDailyPerformanceSignal ? "button" : undefined}
                tabIndex={onGenerateDailyPerformanceSignal ? 0 : undefined}
                aria-label={onGenerateDailyPerformanceSignal ? "Generate Daily Performance Signal" : undefined}
                title={onGenerateDailyPerformanceSignal ? "View Daily Performance Signal Details" : undefined}
              >
                <p className={cn(
                    "text-4xl font-bold",
                    onGenerateDailyPerformanceSignal && "group-hover/dps:text-primary" 
                )}>
                  ${faceData.price !== null && faceData.price !== undefined ? faceData.price.toFixed(2) : 'N/A'}
                </p>
                <div className={cn(
                    "flex items-baseline space-x-2", 
                    baseChangeColor, 
                    onGenerateDailyPerformanceSignal && "group-hover/dps:text-primary" 
                  )}>
                  <p className="text-lg font-semibold">
                    {faceData.dayChange !== null && faceData.dayChange !== undefined ? `${changePositive ? '+' : ''}${faceData.dayChange.toFixed(2)}` : 'N/A'}
                  </p>
                  <p className="text-lg font-semibold">
                    ({faceData.changePercentage !== null && faceData.changePercentage !== undefined ? `${changePositive ? '+' : ''}${(faceData.changePercentage * 100).toFixed(2)}%` : 'N/A'})
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2"> Data as of: {faceData.timestamp ? format(new Date(faceData.timestamp), 'PP p') : 'N/A'}</p>
              
              {/* Day Low/High bar with clickable L and H values */}
              {faceData.dayLow !== null && faceData.dayLow !== undefined && 
               faceData.dayHigh !== null && faceData.dayHigh !== undefined && 
               faceData.price !== null && faceData.price !== undefined && 
               faceData.dayHigh > faceData.dayLow && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span className={cn("p-0.5 rounded-sm pointer-events-auto relative z-10", onRangeContextClick ? "cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors" : "")} onClick={(e) => { if (onRangeContextClick && faceData.dayLow != null) handleFrontFaceRangeInteraction(e, 'Low', faceData.dayLow, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onRangeContextClick && faceData.dayLow != null) handleFrontFaceRangeInteraction(e, 'Low', faceData.dayLow, faceData); }} role={onRangeContextClick && faceData.dayLow != null ? "button" : undefined} tabIndex={onRangeContextClick && faceData.dayLow != null ? 0 : undefined}> L: ${faceData.dayLow.toFixed(2)} </span>
                    <span className={cn("p-0.5 rounded-sm pointer-events-auto relative z-10", onRangeContextClick ? "cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors" : "")} onClick={(e) => { if (onRangeContextClick && faceData.dayHigh != null) handleFrontFaceRangeInteraction(e, 'High', faceData.dayHigh, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onRangeContextClick && faceData.dayHigh != null) handleFrontFaceRangeInteraction(e, 'High', faceData.dayHigh, faceData); }} role={onRangeContextClick && faceData.dayHigh != null ? "button" : undefined} tabIndex={onRangeContextClick && faceData.dayHigh != null ? 0 : undefined}> H: ${faceData.dayHigh.toFixed(2)} </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 pointer-events-none"><div className={cn("h-1.5 rounded-full", changePositive ? 'bg-green-500' : 'bg-red-500')} style={{ width: `${Math.max(0, Math.min(100, ((faceData.price - faceData.dayLow) / (faceData.dayHigh - faceData.dayLow)) * 100))}%`, }} /></div>
                </div>
              )}
            </CardContent>
          </>
        );
      }
    } else if (card.type === 'trend') {
      const trendCard = card as TrendGameCard;
       if (isBack) { return (<><CardHeader><CardTitle className="text-lg">Trend Details</CardTitle></CardHeader><CardContent><p className="text-sm">{trendCard.backData.explanation}</p></CardContent></>); } 
       else { let trendColorClass = 'text-foreground'; if (trendCard.faceData.trend === 'UP') trendColorClass = 'text-green-600'; if (trendCard.faceData.trend === 'DOWN') trendColorClass = 'text-red-600'; return (<><CardHeader><CardTitle className="text-xl">{trendCard.faceData.symbol}</CardTitle><CardDescription>Price Trend (5-min)</CardDescription></CardHeader><CardContent><p className={`text-3xl font-bold ${trendColorClass}`}>{trendCard.faceData.trend}</p><p className="text-xs text-muted-foreground mt-1">{trendCard.faceData.referenceTimeStart ? format(new Date(trendCard.faceData.referenceTimeStart), 'p') : 'N/A'} - {trendCard.faceData.referenceTimeEnd ? format(new Date(trendCard.faceData.referenceTimeEnd), 'p') : 'N/A'}</p></CardContent></>); }
    }
    return null;
  };

  return <>{renderContent()}</>;
};

export default CardFace;
