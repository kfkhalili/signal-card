import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { 
    DiscoveredCard, 
    PriceDiscoverySignal, 
    PriceChangeSignal, 
    DailyPerformanceSignal, 
    PriceVsSmaSignal,
    PriceRangeContextSignal,
    IntradayTrendSignal // Added new type
} from './types'; 
import { format } from 'date-fns';
import { 
    ArrowDownRight, ArrowUpRight, Minus, 
    TrendingUp, TrendingDown, MinusCircle, 
    ArrowUpCircle, ArrowDownCircle, LineChart // Added icons for range and intraday trend
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogCardFaceProps {
  card: DiscoveredCard; 
  isBack: boolean;
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ card, isBack }) => { 
  const renderFrontContent = () => {
    // ... (existing cases for price_discovery, price_change, daily_performance, price_vs_sma, price_range_context)
    if (card.type === 'price_discovery') {
        const d = card as PriceDiscoverySignal; 
        return <><CardHeader><CardTitle className="text-xl">{d.symbol}</CardTitle><CardDescription>Price Snapshot</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">${d.price.toFixed(2)}</p><p className="text-xs">Snap: {format(new Date(d.timestamp), "p")}</p><p className="text-xs">Logged: {format(new Date(d.discoveredAt), "p")}</p></CardContent></>;
    } else if (card.type === 'price_change') {
        const c = card as PriceChangeSignal; const pD = c.price2 - c.price1; const aPD = Math.abs(pD); let TI = Minus; let tc = 'text-foreground'; let tt = 'FLAT'; if (pD > 0) { TI = ArrowUpRight; tc = 'text-green-600'; tt = 'INCREASE'; } else if (pD < 0) { TI = ArrowDownRight; tc = 'text-red-600'; tt = 'DECREASE'; }
        return <><CardHeader><CardTitle className="text-xl">{c.symbol}</CardTitle><CardDescription>Price Change</CardDescription></CardHeader><CardContent><div className={`flex items-center ${tc} mb-1`}><TI className="h-7 w-7 mr-2" /><p className="text-3xl font-bold">${aPD.toFixed(2)}</p></div><p className={`text-lg font-semibold ${tc}`}>{tt}</p><p className="text-xs">{format(new Date(c.timestamp1),'p')} &rarr; {format(new Date(c.timestamp2),'p')}</p><p className="text-xs">Gen: {format(new Date(c.generatedAt),"p")}</p></CardContent></>;
    } else if (card.type === 'daily_performance') {
        const p = card as DailyPerformanceSignal; const iP = p.data.change >= 0; const cC = p.data.change === 0 ? 'text-muted-foreground' : iP ? 'text-green-600' : 'text-red-600'; let PIcon = MinusCircle; if (iP && p.data.change !== 0) PIcon = TrendingUp; if (!iP && p.data.change !== 0) PIcon = TrendingDown;
        return <><CardHeader><CardTitle className="text-xl">{p.symbol}</CardTitle><CardDescription>Daily Performance</CardDescription></CardHeader><CardContent className="space-y-1"><p>Price: <span className="font-semibold">${p.data.currentPrice.toFixed(2)}</span></p><div className={cn("flex items-center", cC)}><PIcon className="h-5 w-5 mr-1.5" /><p className={`font-semibold`}>{iP ? '+':''}{p.data.change.toFixed(2)} ({(p.data.changePercentage * 100).toFixed(2)}%)</p></div><p className="text-xs">vs Prev Cl: ${p.data.previousClose.toFixed(2)}</p><p className="text-xs">Quote: {format(new Date(p.data.quoteTimestamp),'p')}</p><p className="text-xs">Gen: {format(new Date(p.generatedAt),'p')}</p></CardContent></>;
    } else if (card.type === 'price_vs_sma') {
        const s = card as PriceVsSmaSignal; const rT = s.data.priceAboveSma ? "Above" : "Below"; const rC = s.data.priceAboveSma ? 'text-green-600' : 'text-red-600'; let SI = s.data.priceAboveSma ? TrendingUp : TrendingDown; if (s.data.currentPrice === s.data.smaValue) SI = MinusCircle;
        return <><CardHeader><CardTitle className="text-xl">{s.symbol}</CardTitle><CardDescription>vs {s.data.smaPeriod}D SMA</CardDescription></CardHeader><CardContent className="space-y-1"><div className={cn("flex items-center mb-1",rC)}><SI className="h-5 w-5 mr-1.5"/><p className={`font-semibold`}>{rT} SMA</p></div><p className="text-sm">Price: <span className="font-semibold">${s.data.currentPrice.toFixed(2)}</span></p><p className="text-sm">SMA: <span className="font-semibold">${s.data.smaValue.toFixed(2)}</span></p><p className="text-xs">Quote: {format(new Date(s.data.quoteTimestamp),'p')}</p><p className="text-xs">Gen: {format(new Date(s.generatedAt),'p')}</p></CardContent></>;
    } else if (card.type === 'price_range_context') {
        const r = card as PriceRangeContextSignal; const d = r.data.difference??0; let Icon=MinusCircle; let tI="At"; let cC='text-muted-foreground'; if(d<0.01&&d>-0.01){tI=`At Day ${r.data.levelType}`;}else if(r.data.currentPrice>r.data.levelValue&&r.data.levelType==='High'){tI=`Breaking Day ${r.data.levelType}`;Icon=TrendingUp;cC='text-blue-500';}else if(r.data.currentPrice<r.data.levelValue&&r.data.levelType==='Low'){tI=`Breaking Day ${r.data.levelType}`;Icon=TrendingDown;cC='text-orange-500';}else if(r.data.levelType==='High'){tI=`Below Day ${r.data.levelType}`;Icon=ArrowDownCircle;cC='text-yellow-600';}else{tI=`Above Day ${r.data.levelType}`;Icon=ArrowUpCircle;cC='text-yellow-600';}
        return <><CardHeader><CardTitle className="text-xl">{r.symbol}</CardTitle><CardDescription>vs Day {r.data.levelType}</CardDescription></CardHeader><CardContent className="space-y-1"><div className={cn("flex items-center mb-1",cC)}><Icon className="h-5 w-5 mr-1.5"/><p className={`font-semibold`}>{tI}</p></div><p>Price: <span className="font-semibold">${r.data.currentPrice.toFixed(2)}</span></p><p>Day {r.data.levelType}: <span className="font-semibold">${r.data.levelValue.toFixed(2)}</span></p>{d !== undefined && Math.abs(d) > 0.01 && (<p className="text-xs"> (Diff: ${d.toFixed(2)})</p>)}<p className="text-xs">Quote: {format(new Date(r.data.quoteTimestamp),'p')}</p><p className="text-xs">Gen: {format(new Date(r.generatedAt),'p')}</p></CardContent></>;
    } else if (card.type === 'intraday_trend') {
      const trendSignal = card as IntradayTrendSignal;
      let TrendIcon = LineChart; // Default or general trend icon
      let trendColor = 'text-muted-foreground';
      let trendText = `At Open`;

      if (trendSignal.data.relationToOpen === 'Above') {
        TrendIcon = TrendingUp;
        trendColor = 'text-green-600';
        trendText = 'Above Open';
      } else if (trendSignal.data.relationToOpen === 'Below') {
        TrendIcon = TrendingDown;
        trendColor = 'text-red-600';
        trendText = 'Below Open';
      }
      return (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{trendSignal.symbol}</CardTitle>
            <CardDescription>Intraday Trend (vs Open)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={cn("flex items-center mb-1", trendColor)}>
                <TrendIcon className="h-5 w-5 mr-1.5" />
                <p className={`text-lg font-semibold`}>{trendText}</p>
            </div>
            <p className="text-sm">Price: <span className="font-semibold">${trendSignal.data.currentPrice.toFixed(2)}</span></p>
            <p className="text-sm">Open: <span className="font-semibold">${trendSignal.data.openPrice.toFixed(2)}</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Quote Time: {format(new Date(trendSignal.data.quoteTimestamp), 'p')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generated: {format(new Date(trendSignal.generatedAt), 'PP p')}
            </p>
          </CardContent>
        </>
      );
    }
    return (
      <CardContent><p>Unknown discovered card type.</p><pre className="text-xs">{JSON.stringify(card, null, 2)}</pre></CardContent>
    );
  };

  const renderBackContent = () => {
    // ... (existing cases)
    if (card.type === 'price_discovery') { const d=card as PriceDiscoverySignal; return <><CardHeader><CardTitle>{d.symbol} Details</CardTitle></CardHeader><CardContent>...</CardContent></>; }
    if (card.type === 'price_change') { const c=card as PriceChangeSignal; return <><CardHeader><CardTitle>{c.symbol} Change</CardTitle></CardHeader><CardContent>...</CardContent></>; }
    if (card.type === 'daily_performance') { const p=card as DailyPerformanceSignal; return <><CardHeader><CardTitle>{p.symbol} Perf Context</CardTitle></CardHeader><CardContent>...</CardContent></>; }
    if (card.type === 'price_vs_sma') { const s=card as PriceVsSmaSignal; return <><CardHeader><CardTitle>{s.symbol} vs SMA Expl</CardTitle></CardHeader><CardContent>...</CardContent></>; }
    if (card.type === 'price_range_context') { const r=card as PriceRangeContextSignal; return <><CardHeader><CardTitle>{r.symbol} Day {r.data.levelType} Context</CardTitle></CardHeader><CardContent>...</CardContent></>; }
    if (card.type === 'intraday_trend') {
      const trendSignal = card as IntradayTrendSignal;
      const relationText = trendSignal.data.relationToOpen.toLowerCase();
      let explanation = `At the quote time (${format(new Date(trendSignal.data.quoteTimestamp), 'p')}), ${trendSignal.symbol}'s price of $${trendSignal.data.currentPrice.toFixed(2)} was ${relationText} its opening price of $${trendSignal.data.openPrice.toFixed(2)}.`;
      if (trendSignal.data.relationToOpen === 'Above') {
        explanation += " This can be seen as a bullish intraday sign.";
      } else if (trendSignal.data.relationToOpen === 'Below') {
        explanation += " This can be seen as a bearish intraday sign.";
      } else {
        explanation += " The price was effectively at the open.";
      }

      return (
         <>
          <CardHeader>
            <CardTitle className="text-lg">{trendSignal.symbol} - Intraday Trend Explained</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>{explanation}</p>
            <p>Signal generated: {format(new Date(trendSignal.generatedAt), 'p, PP')}</p>
          </CardContent>
        </>
      );
    }
    return (
      <CardContent><p>Unknown card type (back).</p><pre className="text-xs">{JSON.stringify(card, null, 2)}</pre></CardContent>
    );
  };

  return (
    <>
      {isBack ? renderBackContent() : renderFrontContent()}
    </>
  );
};

export default LogCardFace;
