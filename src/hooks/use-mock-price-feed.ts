
"use client";

import { useState, useEffect, useCallback } from 'react';

const AAPL_INITIAL_PRICE = 170.00;
const PRICE_CHANGE_MAX = 0.50; // Max change per interval
const PRICE_HISTORY_LENGTH = 10; // Keep last 10 prices for trend calculation

export interface PriceData {
  price: number;
  timestamp: Date;
}

interface MockPriceFeedOptions {
  symbol?: string;
  intervalMs?: number;
  historyLength?: number;
}

export function useMockPriceFeed(options?: MockPriceFeedOptions) {
  const { 
    symbol = 'AAPL', 
    intervalMs = 5 * 60 * 1000, // Default 5 minutes
    // intervalMs = 10 * 1000, // For testing: 10 seconds
    historyLength = PRICE_HISTORY_LENGTH 
  } = options || {};

  const [latestPriceData, setLatestPriceData] = useState<PriceData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  const [nextUpdateInSeconds, setNextUpdateInSeconds] = useState<number | null>(null);

  const generateNewPrice = useCallback((currentPrice: number) => {
    const change = (Math.random() - 0.5) * 2 * PRICE_CHANGE_MAX; // Random change between -PRICE_CHANGE_MAX and +PRICE_CHANGE_MAX
    const newPrice = parseFloat((currentPrice + change).toFixed(2));
    return Math.max(0.01, newPrice); // Ensure price doesn't go below 0.01
  }, []);

  useEffect(() => {
    // Initialize with a first price
    const now = new Date();
    const initialPrice = { price: AAPL_INITIAL_PRICE, timestamp: now };
    setLatestPriceData(initialPrice);
    setPriceHistory([initialPrice]);
    setNextUpdateInSeconds(Math.floor(intervalMs / 1000));

    const priceUpdateTimer = setInterval(() => {
      setLatestPriceData(prevData => {
        const newPriceValue = generateNewPrice(prevData ? prevData.price : AAPL_INITIAL_PRICE);
        const newTimestamp = new Date();
        const newPricePoint = { price: newPriceValue, timestamp: newTimestamp };
        
        setPriceHistory(prevHistory => {
          const updatedHistory = [newPricePoint, ...prevHistory];
          return updatedHistory.slice(0, historyLength);
        });
        
        setNextUpdateInSeconds(Math.floor(intervalMs / 1000)); // Reset countdown
        return newPricePoint;
      });
    }, intervalMs);

    return () => clearInterval(priceUpdateTimer);
  }, [symbol, intervalMs, historyLength, generateNewPrice]);

  useEffect(() => {
    if (nextUpdateInSeconds === null) return;

    if (nextUpdateInSeconds <= 0) {
      // This case should ideally be handled by the priceUpdateTimer resetting it.
      // If it reaches here, it means the main timer might be slightly delayed.
      // We can just let the main timer handle the reset.
      return;
    }

    const countdownTimer = setInterval(() => {
      setNextUpdateInSeconds(prevSeconds => {
        if (prevSeconds === null || prevSeconds <= 1) {
          // Let the priceUpdateTimer handle the reset to full interval.
          // It might show 0 for a brief moment before the next price update.
          return 0; 
        }
        return prevSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [nextUpdateInSeconds]);

  return { latestPriceData, priceHistory, nextUpdateInSeconds };
}

