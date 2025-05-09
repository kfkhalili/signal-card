import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { 
    PriceGameCard, 
    TrendGameCard, 
    ActiveGameCard, 
    PriceCardFaceData, 
    PriceCardBackData,
    DiscoveredCard, 
    PriceDiscoverySignal, 
    PriceChangeSignal, 
    DailyPerformanceSignal, 
    PriceVsSmaSignal,
    PriceRangeContextSignal,
    IntradayTrendSignal,
    PriceSnapshotSignal,
    DisplayableCard 
} from './types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
    ArrowDownRight, ArrowUpRight, Minus, 
    TrendingUp, TrendingDown, MinusCircle, 
    ArrowUpCircle, ArrowDownCircle, LineChart,
    Camera 
} from 'lucide-react';

interface CardFaceProps {
  card: DisplayableCard; 
  isBack: boolean;
  onSmaClick?: (smaPeriod: 50 | 200, smaValue: number, faceData: PriceCardFaceData) => void;
  onRangeContextClick?: (levelType: 'High' | 'Low', levelValue: number, faceData: PriceCardFaceData) => void;
  onOpenPriceClick?: (faceData: PriceCardFaceData) => void; 
  onGenerateDailyPerformanceSignal?: (faceData: PriceCardFaceData) => void;
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
  onGenerateDailyPerformanceSignal
}) => {

  const handleBackFaceSmaInteraction = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>, smaPeriod: 50 | 200, smaValue: number | null | undefined, faceDataForSma: PriceCardFaceData) => {
    if (card.type === 'price' && onSmaClick && smaValue !== null && smaValue !== undefined) {
      e.stopPropagation(); 
      onSmaClick(smaPeriod, smaValue, faceDataForSma);
    }
  };
  const handleFrontFaceRangeInteraction = (e: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent<HTMLSpanElement>,levelType: 'High' | 'Low',levelValue: number | null | undefined, faceDataForRange: PriceCardFaceData) => {
    if (card.type === 'price' && onRangeContextClick && levelValue !== null && levelValue !== undefined) {
      e.stopPropagation();
      onRangeContextClick(levelType, levelValue, faceDataForRange);
    }
  };
  const handleBackFaceOpenPriceInteraction = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>, faceDataForOpen: PriceCardFaceData) => {
    if (card.type === 'price' && onOpenPriceClick && faceDataForOpen.dayOpen != null) {
      e.stopPropagation();
      onOpenPriceClick(faceDataForOpen);
    }
  };
  const handleDailyPerformanceInteraction = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>, faceDataForSignal: PriceCardFaceData) => {
    if (card.type === 'price' && onGenerateDailyPerformanceSignal) {
      e.stopPropagation();
      onGenerateDailyPerformanceSignal(faceDataForSignal);
    } 
  };

  const renderLivePriceCardFront = (priceCard: PriceGameCard) => {
    const faceData = priceCard.faceData as PriceCardFaceData;
    const changePositive = faceData.dayChange !== null && faceData.dayChange !== undefined && faceData.dayChange >= 0;
    const baseChangeColor = faceData.dayChange === 0 ? 'text-muted-foreground' : changePositive ? 'text-green-600' : 'text-red-600';
    return (
      <div data-testid="card-face-front-content" className="pointer-events-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div> <CardTitle className="text-2xl">{faceData.symbol}</CardTitle> <CardDescription>Live Quote</CardDescription> </div>
            <p className="text-xs text-muted-foreground"> {faceData.timestamp ? format(new Date(faceData.timestamp), 'p') : 'N/A'} </p>
          </div>
        </CardHeader>
        <CardContent>
          <div data-testid="daily-performance-interactive-area" data-interactive-child="true" className={cn("group/dps rounded-md p-2 -mx-2 -my-1 mb-1", onGenerateDailyPerformanceSignal ? "cursor-pointer hover:bg-muted/30 transition-colors pointer-events-auto relative z-10" : "")} onClick={(e) => { handleDailyPerformanceInteraction(e, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ')) { handleDailyPerformanceInteraction(e, faceData); } }} role={onGenerateDailyPerformanceSignal ? "button" : undefined} tabIndex={onGenerateDailyPerformanceSignal ? 0 : undefined}>
            <p className={cn("text-4xl font-bold", onGenerateDailyPerformanceSignal && "group-hover/dps:text-primary" )}>${faceData.price !== null && faceData.price !== undefined ? faceData.price.toFixed(2) : 'N/A'}</p>
            <div className={cn("flex items-baseline space-x-2", baseChangeColor, onGenerateDailyPerformanceSignal && "group-hover/dps:text-primary" )}>
              <p className="text-lg font-semibold">{faceData.dayChange !== null && faceData.dayChange !== undefined ? `${changePositive ? '+' : ''}${faceData.dayChange.toFixed(2)}` : 'N/A'}</p>
              <p className="text-lg font-semibold">({faceData.changePercentage !== null && faceData.changePercentage !== undefined ? `${changePositive ? '+' : ''}${(faceData.changePercentage * 100).toFixed(2)}%` : 'N/A'})</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2"> Data as of: {faceData.timestamp ? format(new Date(faceData.timestamp), 'PP p') : 'N/A'}</p>
          {faceData.dayLow !== null && faceData.dayLow !== undefined && faceData.dayHigh !== null && faceData.dayHigh !== undefined && faceData.price !== null && faceData.price !== undefined && faceData.dayHigh > faceData.dayLow && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span data-testid="day-low-interactive-area" data-interactive-child="true" className={cn("p-0.5 rounded-sm pointer-events-auto relative z-10", onRangeContextClick ? "cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors" : "")} onClick={(e) => { if (faceData.dayLow != null) handleFrontFaceRangeInteraction(e, 'Low', faceData.dayLow, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && faceData.dayLow != null) handleFrontFaceRangeInteraction(e, 'Low', faceData.dayLow, faceData); }} role={onRangeContextClick && faceData.dayLow != null ? "button" : undefined} tabIndex={onRangeContextClick && faceData.dayLow != null ? 0 : undefined}> L: ${faceData.dayLow.toFixed(2)} </span>
                <span data-testid="day-high-interactive-area" data-interactive-child="true" className={cn("p-0.5 rounded-sm pointer-events-auto relative z-10", onRangeContextClick ? "cursor-pointer hover:bg-muted/30 hover:text-primary transition-colors" : "")} onClick={(e) => { if (faceData.dayHigh != null) handleFrontFaceRangeInteraction(e, 'High', faceData.dayHigh, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && faceData.dayHigh != null) handleFrontFaceRangeInteraction(e, 'High', faceData.dayHigh, faceData); }} role={onRangeContextClick && faceData.dayHigh != null ? "button" : undefined} tabIndex={onRangeContextClick && faceData.dayHigh != null ? 0 : undefined}> H: ${faceData.dayHigh.toFixed(2)} </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 pointer-events-none"><div className={cn("h-1.5 rounded-full", changePositive ? 'bg-green-500' : 'bg-red-500')} style={{ width: `${Math.max(0, Math.min(100, ((faceData.price - faceData.dayLow) / (faceData.dayHigh - faceData.dayLow)) * 100))}%`, }} /></div>
            </div>
          )}
        </CardContent>
      </div>
    );
  };

  const renderLivePriceCardBack = (priceCard: PriceGameCard) => {
    const faceData = priceCard.faceData as PriceCardFaceData;
    const backData = priceCard.backData as PriceCardBackData;
    return (
      <div data-testid="card-face-back-content" className="pointer-events-auto">
        <CardHeader><CardTitle className="text-lg">{faceData.symbol} - Details</CardTitle><CardDescription>{backData.explanation || 'Market Data & Technicals'}</CardDescription></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div data-testid="open-price-interactive-area" data-interactive-child="true" className={cn("p-0.5 rounded-sm transition-colors relative z-10 pointer-events-auto", onOpenPriceClick && faceData.dayOpen != null ? "cursor-pointer hover:bg-muted/30 hover:text-primary" : "")} onClick={(e) => { if (faceData.dayOpen != null) handleBackFaceOpenPriceInteraction(e, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && faceData.dayOpen != null) { handleBackFaceOpenPriceInteraction(e, faceData); } }} role={onOpenPriceClick && faceData.dayOpen != null ? "button" : undefined} tabIndex={onOpenPriceClick && faceData.dayOpen != null ? 0 : undefined}><span className="font-semibold">Open:</span> ${faceData.dayOpen?.toFixed(2) ?? 'N/A'}</div>
            <p><span className="font-semibold">Prev Close:</span> ${faceData.previousClose?.toFixed(2) ?? 'N/A'}</p>
            <p><span className="font-semibold">Day High:</span> ${faceData.dayHigh?.toFixed(2) ?? 'N/A'}</p>
            <p><span className="font-semibold">Day Low:</span> ${faceData.dayLow?.toFixed(2) ?? 'N/A'}</p>
            <p><span className="font-semibold">Volume:</span> {faceData.volume?.toLocaleString() ?? 'N/A'}</p>
            <p><span className="font-semibold">Market Cap:</span> {formatMarketCap(backData.marketCap)}</p>
            <div data-testid="sma-50d-interactive-area" data-interactive-child="true" className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma50d != null ? "cursor-pointer hover:bg-muted/30 hover:text-primary" : "")} onClick={(e) => { if (backData.sma50d != null) handleBackFaceSmaInteraction(e, 50, backData.sma50d, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && backData.sma50d != null) { handleBackFaceSmaInteraction(e, 50, backData.sma50d, faceData); } }} role={onSmaClick && backData.sma50d != null ? "button" : undefined} tabIndex={onSmaClick && backData.sma50d != null ? 0 : undefined}><span className="font-semibold">50D SMA:</span> {backData.sma50d?.toFixed(2) ?? 'N/A'}</div>
            <div data-testid="sma-200d-interactive-area" data-interactive-child="true" className={cn("mt-1 p-1 rounded-md transition-colors relative z-10 pointer-events-auto", onSmaClick && backData.sma200d != null ? "cursor-pointer hover:bg-muted/30 hover:text-primary" : "")} onClick={(e) => { if (backData.sma200d != null) handleBackFaceSmaInteraction(e, 200, backData.sma200d, faceData); }} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && backData.sma200d != null) { handleBackFaceSmaInteraction(e, 200, backData.sma200d, faceData); } }} role={onSmaClick && backData.sma200d != null ? "button" : undefined} tabIndex={onSmaClick && backData.sma200d != null ? 0 : undefined}><span className="font-semibold">200D SMA:</span> {backData.sma200d?.toFixed(2) ?? 'N/A'}</div>
          </div>
        </CardContent>
      </div>
    );
  };

  const renderDiscoveredCardFront = (discoveredCard: DiscoveredCard) => {
    let content;
    if (discoveredCard.type === 'price_discovery') { /* ... from log-card-face ... */ content = <p>Price Discovery</p>; } 
    else if (discoveredCard.type === 'price_change') { /* ... from log-card-face ... */ content = <p>Price Change</p>; } 
    else if (discoveredCard.type === 'daily_performance') { const p = discoveredCard as DailyPerformanceSignal; const iP = p.data.change >= 0; const cC = p.data.change === 0 ? 'text-muted-foreground' : iP ? 'text-green-600' : 'text-red-600'; let PIcon = MinusCircle; if (iP && p.data.change !== 0) PIcon = TrendingUp; if (!iP && p.data.change !== 0) PIcon = TrendingDown; content = <><CardHeader><CardTitle className="text-xl">{p.symbol}</CardTitle><CardDescription>Daily Performance</CardDescription></CardHeader><CardContent className="space-y-1"><p>Price: <span className="font-semibold">${p.data.currentPrice.toFixed(2)}</span></p><div className={cn("flex items-center", cC)}><PIcon className="h-5 w-5 mr-1.5" /><p className={`font-semibold`}>{iP ? '+':''}{p.data.change.toFixed(2)} ({(p.data.changePercentage * 100).toFixed(2)}%)</p></div><p className="text-xs">vs Prev Cl: ${p.data.previousClose.toFixed(2)}</p><p className="text-xs">Quote: {format(new Date(p.data.quoteTimestamp),'p')}</p><p className="text-xs">Gen: {format(new Date(p.generatedAt),'p')}</p></CardContent></>;}
    else if (discoveredCard.type === 'price_vs_sma') { const s = discoveredCard as PriceVsSmaSignal; const rT = s.data.priceAboveSma ? "Above" : "Below"; const rC = s.data.priceAboveSma ? 'text-green-600' : 'text-red-600'; let SI = s.data.priceAboveSma ? TrendingUp : TrendingDown; if (s.data.currentPrice === s.data.smaValue) SI = MinusCircle; content = <><CardHeader><CardTitle className="text-xl">{s.symbol}</CardTitle><CardDescription>vs {s.data.smaPeriod}D SMA</CardDescription></CardHeader><CardContent className="space-y-1"><div className={cn("flex items-center mb-1",rC)}><SI className="h-5 w-5 mr-1.5"/><p className={`font-semibold`}>{rT} SMA</p></div><p className="text-sm">Price: <span className="font-semibold">${s.data.currentPrice.toFixed(2)}</span></p><p className="text-sm">SMA: <span className="font-semibold">${s.data.smaValue.toFixed(2)}</span></p><p className="text-xs">Quote: {format(new Date(s.data.quoteTimestamp),'p')}</p><p className="text-xs">Gen: {format(new Date(s.generatedAt),'p')}</p></CardContent></>;}
    else if (discoveredCard.type === 'price_range_context') { const r = discoveredCard as PriceRangeContextSignal; const d = r.data.difference??0; let Icon=MinusCircle; let tI="At"; let cC='text-muted-foreground'; if(d<0.01&&d>-0.01){tI=`At Day ${r.data.levelType}`;}else if(r.data.currentPrice>r.data.levelValue&&r.data.levelType==='High'){tI=`Breaking Day ${r.data.levelType}`;Icon=TrendingUp;cC='text-blue-500';}else if(r.data.currentPrice<r.data.levelValue&&r.data.levelType==='Low'){tI=`Breaking Day ${r.data.levelType}`;Icon=TrendingDown;cC='text-orange-500';}else if(r.data.levelType==='High'){tI=`Below Day ${r.data.levelType}`;Icon=ArrowDownCircle;cC='text-yellow-600';}else{tI=`Above Day ${r.data.levelType}`;Icon=ArrowUpCircle;cC='text-yellow-600';} content = <><CardHeader><CardTitle className="text-xl">{r.symbol}</CardTitle><CardDescription>vs Day {r.data.levelType}</CardDescription></CardHeader><CardContent className="space-y-1"><div className={cn("flex items-center mb-1",cC)}><Icon className="h-5 w-5 mr-1.5"/><p className={`font-semibold`}>{tI}</p></div><p>Price: <span className="font-semibold">${r.data.currentPrice.toFixed(2)}</span></p><p>Day {r.data.levelType}: <span className="font-semibold">${r.data.levelValue.toFixed(2)}</span></p>{d !== undefined && Math.abs(d) > 0.01 && (<p className="text-xs"> (Diff: ${d.toFixed(2)})</p>)}<p className="text-xs">Quote: {format(new Date(r.data.quoteTimestamp),'p')}</p><p className="text-xs">Gen: {format(new Date(r.generatedAt),'p')}</p></CardContent></>;}
    else if (discoveredCard.type === 'intraday_trend') { const tS = discoveredCard as IntradayTrendSignal; let TI=LineChart; let tc='text-muted-foreground'; let tt=`At Open`; if(tS.data.relationToOpen==='Above'){TI=TrendingUp;tc='text-green-600';tt='Above Open';}else if(tS.data.relationToOpen==='Below'){TI=TrendingDown;tc='text-red-600';tt='Below Open';} content = <><CardHeader><CardTitle className="text-xl">{tS.symbol}</CardTitle><CardDescription>Intraday Trend</CardDescription></CardHeader><CardContent className="space-y-1"><div className={cn("flex items-center mb-1",tc)}><TI className="h-5 w-5 mr-1.5"/><p className={`font-semibold`}>{tt}</p></div><p>Price: <span className="font-semibold">${tS.data.currentPrice.toFixed(2)}</span></p><p>Open: <span className="font-semibold">${tS.data.openPrice.toFixed(2)}</span></p><p className="text-xs">Quote: {format(new Date(tS.data.quoteTimestamp),'p')}</p><p className="text-xs">Gen: {format(new Date(tS.generatedAt),'p')}</p></CardContent></>;}
    else if (discoveredCard.type === 'price_snapshot') { const snap = discoveredCard as PriceSnapshotSignal; const face = snap.data.faceData; const isPositive = face.dayChange != null && face.dayChange >= 0; const changeColor = face.dayChange === 0 ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'; content = <><CardHeader><div className="flex justify-between items-start"><CardTitle className="text-xl">{snap.symbol} Snapshot</CardTitle><Camera className="h-5 w-5 text-muted-foreground"/></div><CardDescription>As of: {format(new Date(snap.data.quoteTimestamp), 'p, PP')}</CardDescription></CardHeader><CardContent className="space-y-1 text-sm"><p>Price: <span className="font-semibold">${face.price.toFixed(2)}</span></p><div className={cn("flex items-baseline space-x-1 text-xs", changeColor)}><span>{face.dayChange != null ? `${isPositive ? '+':''}${face.dayChange.toFixed(2)}` : 'N/A'}</span><span>({face.changePercentage != null ? `${isPositive ? '+':''}${(face.changePercentage * 100).toFixed(2)}%` : 'N/A'})</span></div><p>Volume: <span className="font-semibold">{face.volume?.toLocaleString() ?? 'N/A'}</span></p><p className="text-xs text-muted-foreground mt-1">Snapshot Taken: {format(new Date(snap.generatedAt), 'PP p')}</p></CardContent></>;}
    else { content = <CardContent><p>Unknown discovered card type.</p><pre className="text-xs">{JSON.stringify(card, null, 2)}</pre></CardContent>; }
    return <div className="pointer-events-none w-full h-full">{content}</div>;
  };

  const renderDiscoveredCardBackContent = (discoveredCard: DiscoveredCard) => {
    let content;
    if (discoveredCard.type === 'price_discovery') { /* ... */ content = <p>Back of Price Discovery</p>;}
    else if (discoveredCard.type === 'price_change') { /* ... */ content = <p>Back of Price Change</p>;}
    else if (discoveredCard.type === 'daily_performance') { const p=discoveredCard as DailyPerformanceSignal; content = <><CardHeader><CardTitle>{p.symbol} Perf Context</CardTitle></CardHeader><CardContent>Change: {p.data.change}</CardContent></>; }
    else if (discoveredCard.type === 'price_vs_sma') { const s=discoveredCard as PriceVsSmaSignal; const aB = s.data.priceAboveSma?"above":"below"; const sig = s.data.smaPeriod === 200 ? "key long-term" : "medium-term"; const expl = `Price $${s.data.currentPrice.toFixed(2)} was ${aB} its ${s.data.smaPeriod}D SMA of $${s.data.smaValue.toFixed(2)}. This is a ${s.data.priceAboveSma?'bullish':'bearish'} ${sig} signal.`; content = <><CardHeader><CardTitle className="text-lg">{s.symbol} vs. {s.data.smaPeriod}D SMA</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p>{expl}</p><p>Generated: {format(new Date(s.generatedAt),'p,PP')}</p></CardContent></>;}
    else if (discoveredCard.type === 'price_range_context') { const r=discoveredCard as PriceRangeContextSignal; const d=r.data.difference??0; let expl=`Price $${r.data.currentPrice.toFixed(2)} vs Day ${r.data.levelType} $${r.data.levelValue.toFixed(2)}.`; if(d<0.01&&d>-0.01)expl+=` At Day ${r.data.levelType}.`; else expl+=` Diff: $${d.toFixed(2)}.`; content = <><CardHeader><CardTitle>{r.symbol} Day {r.data.levelType} Context</CardTitle></CardHeader><CardContent><p>{expl}</p><p>Generated: {format(new Date(r.generatedAt),'p,PP')}</p></CardContent></>;}
    else if (discoveredCard.type === 'intraday_trend') { const tS=discoveredCard as IntradayTrendSignal; const rT=tS.data.relationToOpen.toLowerCase();let expl=`At ${format(new Date(tS.data.quoteTimestamp),'p')}, ${tS.symbol} price $${tS.data.currentPrice.toFixed(2)} was ${rT} its open $${tS.data.openPrice.toFixed(2)}.`;if(tS.data.relationToOpen==='Above')expl+=" Bullish.";else if(tS.data.relationToOpen==='Below')expl+=" Bearish.";else expl+=" At open."; content = <><CardHeader><CardTitle className="text-lg">{tS.symbol} - Intraday Trend</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p>{expl}</p><p>Generated: {format(new Date(tS.generatedAt),'p,PP')}</p></CardContent></>;}
    else if (discoveredCard.type === 'price_snapshot') {
      const snap = discoveredCard as PriceSnapshotSignal; const face = snap.data.faceData; const back = snap.data.backData;
      content = <><CardHeader><CardTitle className="text-lg">{snap.symbol} - Snapshot Details</CardTitle><CardDescription>Data at {format(new Date(snap.data.quoteTimestamp),'p,PP')}</CardDescription></CardHeader><CardContent className="text-sm space-y-1"><p><strong>Open:</strong> ${face.dayOpen?.toFixed(2)??'N/A'}</p><p><strong>High:</strong> ${face.dayHigh?.toFixed(2)??'N/A'}</p><p><strong>Low:</strong> ${face.dayLow?.toFixed(2)??'N/A'}</p><p><strong>Prev. Close:</strong> ${face.previousClose?.toFixed(2)??'N/A'}</p><hr className="my-1"/><p><strong>50D SMA:</strong> ${back.sma50d?.toFixed(2)??'N/A'}</p><p><strong>200D SMA:</strong> ${back.sma200d?.toFixed(2)??'N/A'}</p><p><strong>Market Cap:</strong> {formatMarketCap(back.marketCap)}</p><hr className="my-1"/><p className="text-xs">Snap: {format(new Date(snap.generatedAt),'p,PP')}</p><p className="text-xs">Expl: {back.explanation}</p></CardContent></>;
    } else {
        content = <CardContent><p>Unknown card type (back).</p><pre className="text-xs">{JSON.stringify(card, null, 2)}</pre></CardContent>;
    }
    return <div className="pointer-events-none w-full h-full">{content}</div>;
  };

  // Main rendering logic for CardFace
  if (isBack) {
    if (card.type === 'price') {
      return renderLivePriceCardBack(card as PriceGameCard); // Specific renderer for live card back
    } else {
      // All other card types (DiscoveredCard types) use this for their back face
      return renderDiscoveredCardBackContent(card as DiscoveredCard);
    }
  } else {
    // Front faces for ALL card types (live or discovered)
    if (card.type === 'price') {
      return renderLivePriceCardFront(card as PriceGameCard);
    } else {
      // Front faces of discovered cards
      return renderDiscoveredCardFront(card as DiscoveredCard);
    }
  }
};

export default CardFace;
