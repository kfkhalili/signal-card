import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { PriceGameCard, TrendGameCard, ActiveGameCard, PriceCardFaceData, PriceCardBackData } from './types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CardFaceProps {
  card: ActiveGameCard;
  isBack: boolean;
  onSmaClick?: (smaPeriod: 50 | 200, smaValue: number, faceData: PriceCardFaceData) => void;
  onRangeContextClick?: (levelType: 'High' | 'Low', levelValue: number, faceData: PriceCardFaceData) => void;
}

const formatMarketCap = (cap: number | null | undefined): string => {
  if (cap === null || cap === undefined) return 'N/A';
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
  return cap.toString();
};

const CardFace: React.FC<CardFaceProps> = ({ card, isBack, onSmaClick, onRangeContextClick }) => {
  if (isBack && card.type === 'price') {
    console.log("CardFace (Back): onSmaClick prop is type:", typeof onSmaClick, "Is it a function?", onSmaClick !== undefined);
  }
  if (!isBack && card.type === 'price') {
    console.log("CardFace (Front): onRangeContextClick prop is type:", typeof onRangeContextClick, "Is it a function?", onRangeContextClick !== undefined);
  }

  const handleBackFaceSmaInteraction = (
    e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>,
    smaPeriod: 50 | 200, 
    smaValue: number | null | undefined,
    faceDataForSma: PriceCardFaceData 
  ) => {
    if (onSmaClick && smaValue !== null && smaValue !== undefined) {
      console.log(`CardFace: SMA ${smaPeriod}D area clicked/keyed. Stopping propagation and calling onSmaClick.`);
      e.stopPropagation(); 
      onSmaClick(smaPeriod, smaValue, faceDataForSma);
    } else {
      console.log("CardFace: Click/key on back, but not a valid SMA or onSmaClick missing.");
    }
  };

  const handleFrontFaceRangeInteraction = (
    e: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>,
    levelType: 'High' | 'Low',
    levelValue: number | null | undefined,
    faceDataForRange: PriceCardFaceData
  ) => {
    if (onRangeContextClick && levelValue !== null && levelValue !== undefined) {
      console.log(`CardFace: Day ${levelType} area clicked/keyed. Stopping propagation and calling onRangeContextClick.`);
      e.stopPropagation();
      onRangeContextClick(levelType, levelValue, faceDataForRange);
    } else {
      console.log("CardFace: Click/key on front range, but not valid or onRangeContextClick missing.");
    }
  };

  const renderContent = () => {
    if (card.type === 'price') {
      const priceCard = card as PriceGameCard;
      const faceData = priceCard.faceData as PriceCardFaceData;
      const backData = priceCard.backData as PriceCardBackData;

      if (isBack) {
        return (
          <>
            <CardHeader><CardTitle className="text-lg">{faceData.symbol} - Details</CardTitle><CardDescription>{backData.explanation || 'Market Data & Technicals'}</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p><span className="font-semibold">Open:</span> ${faceData.dayOpen?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Prev Close:</span> ${faceData.previousClose?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Day High:</span> ${faceData.dayHigh?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Day Low:</span> ${faceData.dayLow?.toFixed(2) ?? 'N/A'}</p>
                <p><span className="font-semibold">Volume:</span> {faceData.volume?.toLocaleString() ?? 'N/A'}</p>
                <p><span className="font-semibold">Market Cap:</span> {formatMarketCap(backData.marketCap)}</p>
                <div className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma50d != null ? "cursor-pointer hover:bg-muted" : "")} onClick={(e) => { if (onSmaClick && backData.sma50d != null) handleBackFaceSmaInteraction(e, 50, backData.sma50d, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSmaClick && backData.sma50d != null) { handleBackFaceSmaInteraction(e, 50, backData.sma50d, faceData); } }} role={onSmaClick && backData.sma50d != null ? "button" : undefined} tabIndex={onSmaClick && backData.sma50d != null ? 0 : undefined}><span className="font-semibold">50D SMA:</span> {backData.sma50d?.toFixed(2) ?? 'N/A'}</div>
                <div className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma200d != null ? "cursor-pointer hover:bg-muted" : "")} onClick={(e) => { if (onSmaClick && backData.sma200d != null) handleBackFaceSmaInteraction(e, 200, backData.sma200d, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSmaClick && backData.sma200d != null) { handleBackFaceSmaInteraction(e, 200, backData.sma200d, faceData); } }} role={onSmaClick && backData.sma200d != null ? "button" : undefined} tabIndex={onSmaClick && backData.sma200d != null ? 0 : undefined}><span className="font-semibold">200D SMA:</span> {backData.sma200d?.toFixed(2) ?? 'N/A'}</div>
              </div>
            </CardContent>
          </>
        );
      } else { // Front of Price Card
        const changePositive = faceData.dayChange !== null && faceData.dayChange !== undefined && faceData.dayChange >= 0;
        const changeColor = faceData.dayChange === 0 ? 'text-muted-foreground' : changePositive ? 'text-green-600' : 'text-red-600';

        return (
          <>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div> {/* This div wraps Title and Description */}
                    <CardTitle className="text-2xl">{faceData.symbol}</CardTitle>
                    <CardDescription>Live Quote</CardDescription>
                </div> {/* Corrected closing div tag */}
                <p className="text-xs text-muted-foreground">
                    {faceData.timestamp ? format(new Date(faceData.timestamp), 'p') : 'N/A'}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold mb-1">${faceData.price !== null && faceData.price !== undefined ? faceData.price.toFixed(2) : 'N/A'}</p>
              <div className={cn("flex items-baseline space-x-2", changeColor)}><p className="text-lg font-semibold">{faceData.dayChange !== null && faceData.dayChange !== undefined ? `${changePositive ? '+' : ''}${faceData.dayChange.toFixed(2)}` : 'N/A'}</p><p className="text-lg font-semibold">({faceData.changePercentage !== null && faceData.changePercentage !== undefined ? `${changePositive ? '+' : ''}${(faceData.changePercentage * 100).toFixed(2)}%` : 'N/A'})</p></div>
              <p className="text-xs text-muted-foreground mt-2"> Data as of: {faceData.timestamp ? format(new Date(faceData.timestamp), 'PP p') : 'N/A'}</p>
              
              {/* Day Low/High bar with clickable L and H values */}
              {faceData.dayLow !== null && faceData.dayLow !== undefined && 
               faceData.dayHigh !== null && faceData.dayHigh !== undefined && 
               faceData.price !== null && faceData.price !== undefined && 
               faceData.dayHigh > faceData.dayLow && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span 
                      className={cn("p-0.5 rounded-sm pointer-events-auto relative z-10", onRangeContextClick ? "cursor-pointer hover:bg-muted" : "")}
                      onClick={(e) => { if (onRangeContextClick && faceData.dayLow != null) handleFrontFaceRangeInteraction(e, 'Low', faceData.dayLow, faceData); }}
                      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onRangeContextClick && faceData.dayLow != null) handleFrontFaceRangeInteraction(e, 'Low', faceData.dayLow, faceData); }}
                      role={onRangeContextClick && faceData.dayLow != null ? "button" : undefined}
                      tabIndex={onRangeContextClick && faceData.dayLow != null ? 0 : undefined}
                    >
                      L: ${faceData.dayLow.toFixed(2)}
                    </span>
                    <span 
                      className={cn("p-0.5 rounded-sm pointer-events-auto relative z-10", onRangeContextClick ? "cursor-pointer hover:bg-muted" : "")}
                      onClick={(e) => { if (onRangeContextClick && faceData.dayHigh != null) handleFrontFaceRangeInteraction(e, 'High', faceData.dayHigh, faceData); }}
                      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onRangeContextClick && faceData.dayHigh != null) handleFrontFaceRangeInteraction(e, 'High', faceData.dayHigh, faceData); }}
                      role={onRangeContextClick && faceData.dayHigh != null ? "button" : undefined}
                      tabIndex={onRangeContextClick && faceData.dayHigh != null ? 0 : undefined}
                    >
                      H: ${faceData.dayHigh.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 pointer-events-none"><div className={cn("h-1.5 rounded-full", changePositive ? 'bg-green-500' : 'bg-red-500')} style={{ width: `${Math.max(0, Math.min(100, ((faceData.price - faceData.dayLow) / (faceData.dayHigh - faceData.dayLow)) * 100))}%`, }} /></div>
                </div>
              )}
            </CardContent>
          </>
        );
      }
    } else if (card.type === 'trend') {
      // ... Trend card rendering ...
       const trendCard = card as TrendGameCard;
       if (isBack) { return (<><CardHeader><CardTitle className="text-lg">Trend Details</CardTitle></CardHeader><CardContent><p className="text-sm">{trendCard.backData.explanation}</p></CardContent></>); } 
       else { let trendColorClass = 'text-foreground'; if (trendCard.faceData.trend === 'UP') trendColorClass = 'text-green-600'; if (trendCard.faceData.trend === 'DOWN') trendColorClass = 'text-red-600'; return (<><CardHeader><CardTitle className="text-xl">{trendCard.faceData.symbol}</CardTitle><CardDescription>Price Trend (5-min)</CardDescription></CardHeader><CardContent><p className={`text-3xl font-bold ${trendColorClass}`}>{trendCard.faceData.trend}</p><p className="text-xs text-muted-foreground mt-1">{trendCard.faceData.referenceTimeStart ? format(new Date(trendCard.faceData.referenceTimeStart), 'p') : 'N/A'} - {trendCard.faceData.referenceTimeEnd ? format(new Date(trendCard.faceData.referenceTimeEnd), 'p') : 'N/A'}</p></CardContent></>); }
    }
    return null;
  };

  return <>{renderContent()}</>;
};

export default CardFace;
