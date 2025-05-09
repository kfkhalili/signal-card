import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { 
    DiscoveredCard, 
    PriceDiscoverySignal, 
    PriceChangeSignal, 
    DailyPerformanceSignal, 
    PriceVsSmaSignal,
    PriceRangeContextSignal // Added new type
} from './types'; 
import { format } from 'date-fns';
import { 
    ArrowDownRight, ArrowUpRight, Minus, 
    TrendingUp, TrendingDown, MinusCircle, 
    ArrowUpCircle, ArrowDownCircle // Added icons for range context
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogCardFaceProps {
  card: DiscoveredCard; 
  isBack: boolean;
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ card, isBack }) => { 
  const renderFrontContent = () => {
    // ... (existing cases for price_discovery, price_change, daily_performance, price_vs_sma)
    if (card.type === 'price_discovery') {
      const discoveryCard = card as PriceDiscoverySignal;
      return (
        <>
          <CardHeader><CardTitle className="text-xl">{discoveryCard.symbol}</CardTitle><CardDescription>Price Snapshot</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">${discoveryCard.price.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Snapshot at: {format(new Date(discoveryCard.timestamp), "PP p")}</p><p className="text-xs text-muted-foreground mt-1">Logged: {format(new Date(discoveryCard.discoveredAt), "PP p")}</p></CardContent>
        </>
      );
    } else if (card.type === 'price_change') {
      const changeCard = card as PriceChangeSignal; const priceDiff = changeCard.price2 - changeCard.price1; const absPriceDiff = Math.abs(priceDiff); let TrendIcon = Minus; let trendColorClass = 'text-foreground'; let trendText = 'FLAT'; if (priceDiff > 0) { TrendIcon = ArrowUpRight; trendColorClass = 'text-green-600'; trendText = 'INCREASE'; } else if (priceDiff < 0) { TrendIcon = ArrowDownRight; trendColorClass = 'text-red-600'; trendText = 'DECREASE'; }
      return (
        <>
          <CardHeader><CardTitle className="text-xl">{changeCard.symbol}</CardTitle><CardDescription>Price Change Signal</CardDescription></CardHeader>
          <CardContent><div className={`flex items-center ${trendColorClass} mb-1`}><TrendIcon className="h-8 w-8 mr-2" /><p className="text-3xl font-bold">${absPriceDiff.toFixed(2)}</p></div><p className={`text-lg font-semibold ${trendColorClass}`}>{trendText}</p><p className="text-xs text-muted-foreground mt-1">{format(new Date(changeCard.timestamp1), 'p')} &rarr; {format(new Date(changeCard.timestamp2), 'p')}</p><p className="text-xs text-muted-foreground mt-1">Generated: {format(new Date(changeCard.generatedAt), "PP p")}</p></CardContent>
        </>
      );
    } else if (card.type === 'daily_performance') {
      const perfCard = card as DailyPerformanceSignal; const isPositive = perfCard.data.change >= 0; const changeColor = perfCard.data.change === 0 ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'; let PerfIcon = MinusCircle; if (isPositive && perfCard.data.change !== 0) PerfIcon = TrendingUp; if (!isPositive && perfCard.data.change !== 0) PerfIcon = TrendingDown;
      return (
        <>
          <CardHeader><CardTitle className="text-xl">{perfCard.symbol}</CardTitle><CardDescription>Daily Performance</CardDescription></CardHeader>
          <CardContent className="space-y-1"><p className="text-lg">Price: <span className="font-semibold">${perfCard.data.currentPrice.toFixed(2)}</span></p><div className={cn("flex items-center", changeColor)}><PerfIcon className="h-5 w-5 mr-1.5" /><p className={`text-lg font-semibold`}>{isPositive ? '+' : ''}{perfCard.data.change.toFixed(2)} ({(perfCard.data.changePercentage * 100).toFixed(2)}%)</p></div><p className="text-xs text-muted-foreground">vs. Prev Close: ${perfCard.data.previousClose.toFixed(2)}</p><p className="text-xs text-muted-foreground">Quote Time: {format(new Date(perfCard.data.quoteTimestamp), 'p')}</p><p className="text-xs text-muted-foreground">Generated: {format(new Date(perfCard.generatedAt), 'PP p')}</p></CardContent>
        </>
      );
    } else if (card.type === 'price_vs_sma') {
      const smaSignal = card as PriceVsSmaSignal; const relationText = smaSignal.data.priceAboveSma ? "Above" : "Below"; const relationColor = smaSignal.data.priceAboveSma ? 'text-green-600' : 'text-red-600'; let SmaIcon = smaSignal.data.priceAboveSma ? TrendingUp : TrendingDown; if (smaSignal.data.currentPrice === smaSignal.data.smaValue) SmaIcon = MinusCircle;
      return (
        <>
          <CardHeader><CardTitle className="text-xl">{smaSignal.symbol}</CardTitle><CardDescription>Price vs. {smaSignal.data.smaPeriod}D SMA</CardDescription></CardHeader>
          <CardContent className="space-y-1"><div className={cn("flex items-center mb-1", relationColor)}><SmaIcon className="h-5 w-5 mr-1.5" /><p className={`text-lg font-semibold`}>Currently {relationText} SMA</p></div><p className="text-sm">Price: <span className="font-semibold">${smaSignal.data.currentPrice.toFixed(2)}</span></p><p className="text-sm">{smaSignal.data.smaPeriod}D SMA: <span className="font-semibold">${smaSignal.data.smaValue.toFixed(2)}</span></p><p className="text-xs text-muted-foreground mt-1">Quote Time: {format(new Date(smaSignal.data.quoteTimestamp), 'p')}</p><p className="text-xs text-muted-foreground mt-1">Signal Generated: {format(new Date(smaSignal.generatedAt), 'PP p')}</p></CardContent>
        </>
      );
    } else if (card.type === 'price_range_context') {
      const rangeSignal = card as PriceRangeContextSignal;
      const diff = rangeSignal.data.difference ?? 0;
      let Icon = MinusCircle;
      let textIndicator = "at";
      let colorClass = "text-muted-foreground";

      if (diff < 0.01 && diff > -0.01) { // Approximately at the level
        textIndicator = "At Day";
      } else if (rangeSignal.data.currentPrice > rangeSignal.data.levelValue && rangeSignal.data.levelType === 'High'){
        textIndicator = "Above Day"; // Should ideally be "Breaking Day High" if diff is small and positive
        Icon = TrendingUp;
        colorClass = "text-blue-500"; // Or a specific color for breakouts
      } else if (rangeSignal.data.currentPrice < rangeSignal.data.levelValue && rangeSignal.data.levelType === 'Low'){
        textIndicator = "Below Day"; // Should ideally be "Breaking Day Low"
        Icon = TrendingDown;
        colorClass = "text-orange-500"; // Or a specific color for breakdowns
      } else if (rangeSignal.data.levelType === 'High') {
        textIndicator = `Near Day`;
        Icon = ArrowDownCircle;
        colorClass = "text-yellow-600";
      } else { // levelType === 'Low'
        textIndicator = `Near Day`;
        Icon = ArrowUpCircle;
        colorClass = "text-yellow-600";
      }

      return (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{rangeSignal.symbol}</CardTitle>
            <CardDescription>Price vs. Day {rangeSignal.data.levelType}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
             <div className={cn("flex items-center mb-1", colorClass)}>
                <Icon className="h-5 w-5 mr-1.5" />
                <p className={`text-lg font-semibold`}>{textIndicator} {rangeSignal.data.levelType}</p>
            </div>
            <p className="text-sm">Price: <span className="font-semibold">${rangeSignal.data.currentPrice.toFixed(2)}</span></p>
            <p className="text-sm">Day {rangeSignal.data.levelType}: <span className="font-semibold">${rangeSignal.data.levelValue.toFixed(2)}</span></p>
            {rangeSignal.data.difference !== undefined && Math.abs(rangeSignal.data.difference) > 0.01 && (
                 <p className="text-xs text-muted-foreground">
                    (Diff: ${rangeSignal.data.difference.toFixed(2)})
                </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Quote Time: {format(new Date(rangeSignal.data.quoteTimestamp), 'p')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generated: {format(new Date(rangeSignal.generatedAt), 'PP p')}
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
    // ... (existing cases for price_discovery, price_change, daily_performance, price_vs_sma)
    if (card.type === 'price_discovery') { const d=card as PriceDiscoverySignal; return <><CardHeader><CardTitle>{d.symbol} Details</CardTitle></CardHeader><CardContent>{d.price} at {format(d.timestamp, 'p')} logged {format(d.discoveredAt, 'p')}</CardContent></>; }
    if (card.type === 'price_change') { const c=card as PriceChangeSignal; return <><CardHeader><CardTitle>{c.symbol} Change</CardTitle></CardHeader><CardContent>{c.price1} to {c.price2}</CardContent></>; }
    if (card.type === 'daily_performance') { const p=card as DailyPerformanceSignal; return <><CardHeader><CardTitle>{p.symbol} Perf</CardTitle></CardHeader><CardContent>Change: {p.data.change}</CardContent></>; }
    if (card.type === 'price_vs_sma') { const s=card as PriceVsSmaSignal; return <><CardHeader><CardTitle>{s.symbol} vs SMA</CardTitle></CardHeader><CardContent>Price {s.data.currentPrice} vs {s.data.smaPeriod}D SMA {s.data.smaValue}</CardContent></>; }
    if (card.type === 'price_range_context') {
      const rangeSignal = card as PriceRangeContextSignal;
      const diffText = rangeSignal.data.difference !== undefined ? Math.abs(rangeSignal.data.difference).toFixed(2) : 'N/A';
      let explanation = `At the quote time, ${rangeSignal.symbol}'s price of $${rangeSignal.data.currentPrice.toFixed(2)} was compared to the Day ${rangeSignal.data.levelType} of $${rangeSignal.data.levelValue.toFixed(2)}.`;
      if (rangeSignal.data.difference !== undefined) {
        if (Math.abs(rangeSignal.data.difference) < 0.01) {
            explanation += ` The price was at the Day ${rangeSignal.data.levelType}.`;
        } else {
            explanation += ` The difference was $${diffText}.`;
        }
      }
      return (
         <>
          <CardHeader>
            <CardTitle className="text-lg">{rangeSignal.symbol} - Day {rangeSignal.data.levelType} Context</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>{explanation}</p>
            <p>Signal generated: {format(new Date(rangeSignal.generatedAt), 'p, PP')}</p>
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
