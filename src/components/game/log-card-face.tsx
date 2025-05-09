import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { DiscoveredCard, PriceDiscoverySignal, PriceChangeSignal, DailyPerformanceSignal, PriceVsSmaSignal } from './types'; // Added PriceVsSmaSignal
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp, TrendingDown, MinusCircle, ExternalLink } from 'lucide-react'; // Added more icons
import { cn } from '@/lib/utils'; // For conditional classes

interface LogCardFaceProps {
  card: DiscoveredCard; 
  isBack: boolean;
}

const LogCardFace: React.FC<LogCardFaceProps> = ({ card, isBack }) => { 
  const renderFrontContent = () => {
    if (card.type === 'price_discovery') {
      // ... existing price_discovery rendering ...
      const discoveryCard = card as PriceDiscoverySignal;
      return (
        <>
          <CardHeader><CardTitle className="text-xl">{discoveryCard.symbol}</CardTitle><CardDescription>Price Snapshot</CardDescription></CardHeader>
          <CardContent><p className="text-3xl font-bold">${discoveryCard.price.toFixed(2)}</p><p className="text-xs text-muted-foreground mt-1">Snapshot at: {format(new Date(discoveryCard.timestamp), "PP p")}</p><p className="text-xs text-muted-foreground mt-1">Logged: {format(new Date(discoveryCard.discoveredAt), "PP p")}</p></CardContent>
        </>
      );
    } else if (card.type === 'price_change') {
      // ... existing price_change rendering ...
      const changeCard = card as PriceChangeSignal; const priceDiff = changeCard.price2 - changeCard.price1; const absPriceDiff = Math.abs(priceDiff); let TrendIcon = Minus; let trendColorClass = 'text-foreground'; let trendText = 'FLAT'; if (priceDiff > 0) { TrendIcon = ArrowUpRight; trendColorClass = 'text-green-600'; trendText = 'INCREASE'; } else if (priceDiff < 0) { TrendIcon = ArrowDownRight; trendColorClass = 'text-red-600'; trendText = 'DECREASE'; }
      return (
        <>
          <CardHeader><CardTitle className="text-xl">{changeCard.symbol}</CardTitle><CardDescription>Price Change Signal</CardDescription></CardHeader>
          <CardContent><div className={`flex items-center ${trendColorClass} mb-1`}><TrendIcon className="h-8 w-8 mr-2" /><p className="text-3xl font-bold">${absPriceDiff.toFixed(2)}</p></div><p className={`text-lg font-semibold ${trendColorClass}`}>{trendText}</p><p className="text-xs text-muted-foreground mt-1">{format(new Date(changeCard.timestamp1), 'p')} &rarr; {format(new Date(changeCard.timestamp2), 'p')}</p><p className="text-xs text-muted-foreground mt-1">Generated: {format(new Date(changeCard.generatedAt), "PP p")}</p></CardContent>
        </>
      );
    } else if (card.type === 'daily_performance') {
      // ... existing daily_performance rendering ...
      const perfCard = card as DailyPerformanceSignal; const isPositive = perfCard.data.change >= 0; const changeColor = perfCard.data.change === 0 ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'; let PerfIcon = MinusCircle; if (isPositive && perfCard.data.change !== 0) PerfIcon = TrendingUp; if (!isPositive && perfCard.data.change !== 0) PerfIcon = TrendingDown;
      return (
        <>
          <CardHeader><CardTitle className="text-xl">{perfCard.symbol}</CardTitle><CardDescription>Daily Performance</CardDescription></CardHeader>
          <CardContent className="space-y-1"><p className="text-lg">Price: <span className="font-semibold">${perfCard.data.currentPrice.toFixed(2)}</span></p><div className={cn("flex items-center", changeColor)}><PerfIcon className="h-5 w-5 mr-1.5" /><p className={`text-lg font-semibold`}>{isPositive ? '+' : ''}{perfCard.data.change.toFixed(2)} ({(perfCard.data.changePercentage * 100).toFixed(2)}%)</p></div><p className="text-xs text-muted-foreground">vs. Prev Close: ${perfCard.data.previousClose.toFixed(2)}</p><p className="text-xs text-muted-foreground">Quote Time: {format(new Date(perfCard.data.quoteTimestamp), 'p')}</p><p className="text-xs text-muted-foreground">Generated: {format(new Date(perfCard.generatedAt), 'PP p')}</p></CardContent>
        </>
      );
    } else if (card.type === 'price_vs_sma') {
      const smaSignal = card as PriceVsSmaSignal;
      const relationText = smaSignal.data.priceAboveSma ? "Above" : "Below";
      const relationColor = smaSignal.data.priceAboveSma ? 'text-green-600' : 'text-red-600';
      let SmaIcon = smaSignal.data.priceAboveSma ? TrendingUp : TrendingDown;
      if (smaSignal.data.currentPrice === smaSignal.data.smaValue) SmaIcon = MinusCircle;

      return (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{smaSignal.symbol}</CardTitle>
            <CardDescription>Price vs. {smaSignal.data.smaPeriod}D SMA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className={cn("flex items-center mb-1", relationColor)}>
                <SmaIcon className="h-5 w-5 mr-1.5" />
                <p className={`text-lg font-semibold`}>
                    Currently {relationText} SMA
                </p>
            </div>
            <p className="text-sm">Price: <span className="font-semibold">${smaSignal.data.currentPrice.toFixed(2)}</span></p>
            <p className="text-sm">{smaSignal.data.smaPeriod}D SMA: <span className="font-semibold">${smaSignal.data.smaValue.toFixed(2)}</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Quote Time: {format(new Date(smaSignal.data.quoteTimestamp), 'p')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Signal Generated: {format(new Date(smaSignal.generatedAt), 'PP p')}
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
    if (card.type === 'price_discovery') {
      // ... existing ...
      const discoveryCard = card as PriceDiscoverySignal; const explanation = `${discoveryCard.symbol}'s stock price was $${discoveryCard.price.toFixed(2)} at ${format(new Date(discoveryCard.timestamp), "p 'on' PP")}. This price point was logged on ${format(new Date(discoveryCard.discoveredAt), "PP 'at' p")}.`; return (<><CardHeader><CardTitle className="text-lg">{discoveryCard.symbol} Price Details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{explanation}</p></CardContent></>);
    } else if (card.type === 'price_change') {
      // ... existing ...
      const changeCard = card as PriceChangeSignal; const priceDiff = changeCard.price2 - changeCard.price1; const absPriceDiff = Math.abs(priceDiff); let trendText = 'remained flat'; if (priceDiff > 0) trendText = `increased by $${absPriceDiff.toFixed(2)}`; else if (priceDiff < 0) trendText = `decreased by $${absPriceDiff.toFixed(2)}`; const explanation = `The price for ${changeCard.symbol} ${trendText}, from $${changeCard.price1.toFixed(2)} (at ${format(new Date(changeCard.timestamp1), 'p')}) to $${changeCard.price2.toFixed(2)} (at ${format(new Date(changeCard.timestamp2), 'p')}). This signal was generated on ${format(new Date(changeCard.generatedAt), "PP 'at' p")}.`; return (<><CardHeader><CardTitle className="text-lg">{changeCard.symbol} Price Change Details</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p>{explanation}</p></CardContent></>);
    } else if (card.type === 'daily_performance') {
      // ... existing ...
      const perfCard = card as DailyPerformanceSignal; return (<><CardHeader><CardTitle className="text-lg">{perfCard.symbol} - Performance Context</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p>This signal shows the stock's performance relative to its previous closing price at the time the signal was generated.</p><p>Current Price: <strong>${perfCard.data.currentPrice.toFixed(2)}</strong></p><p>Previous Close: <strong>${perfCard.data.previousClose.toFixed(2)}</strong></p><p>Change: <strong className={perfCard.data.change >= 0 ? 'text-green-600' : 'text-red-600'}>{perfCard.data.change >= 0 ? '+':''}{perfCard.data.change.toFixed(2)} ({(perfCard.data.changePercentage * 100).toFixed(2)}%)</strong></p><p>Quote as of: {format(new Date(perfCard.data.quoteTimestamp), 'p, PP')}</p><p>Signal generated: {format(new Date(perfCard.generatedAt), 'p, PP')}</p></CardContent></>);
    } else if (card.type === 'price_vs_sma') {
      const smaSignal = card as PriceVsSmaSignal;
      const aboveOrBelow = smaSignal.data.priceAboveSma ? "above" : "below";
      const significance = smaSignal.data.smaPeriod === 200 ? "a key long-term trend indicator." : smaSignal.data.smaPeriod === 50 ? "a common medium-term trend indicator." : "an indicator.";
      const explanation = `At the time of the quote (${format(new Date(smaSignal.data.quoteTimestamp), 'p')}), ${smaSignal.symbol}'s price of $${smaSignal.data.currentPrice.toFixed(2)} was ${aboveOrBelow} its ${smaSignal.data.smaPeriod}-Day SMA of $${smaSignal.data.smaValue.toFixed(2)}. Trading ${aboveOrBelow} this SMA is often considered a ${smaSignal.data.priceAboveSma ? 'bullish' : 'bearish'} signal, as the ${smaSignal.data.smaPeriod}D SMA is ${significance}`;
      return (
         <>
          <CardHeader>
            <CardTitle className="text-lg">{smaSignal.symbol} vs. {smaSignal.data.smaPeriod}D SMA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>{explanation}</p>
            <p>Signal generated: {format(new Date(smaSignal.generatedAt), 'p, PP')}</p>
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
