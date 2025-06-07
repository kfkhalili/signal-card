// src/hooks/use-local-storage.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { Result } from "neverthrow";
import { safeJsonParse } from "@/lib/utils";

type SetValue<T> = (value: T | ((val: T) => T)) => void;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const readValueFromStorage = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    const item = window.localStorage.getItem(key);
    if (!item) {
      return initialValue;
    }

    return safeJsonParse<T>(item).match(
      (parsedValue) => parsedValue,
      (error) => {
        console.warn(
          `[useLocalStorage] Error parsing localStorage item for key “${key}”. Error:`,
          error
        );
        console.error(`[useLocalStorage] Item that failed to parse:`, item);
        return initialValue;
      }
    );
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValueFromStorage);

  const setValue: SetValue<T> = useCallback(
    (valueOrFn) => {
      // Use the updater function form of setState to avoid a dependency on `storedValue`,
      // making this `setValue` function stable across re-renders.
      setStoredValue((prevValue) => {
        const valueToStore =
          valueOrFn instanceof Function ? valueOrFn(prevValue) : valueOrFn;

        if (typeof window !== "undefined") {
          Result.fromThrowable(
            () => {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
              // Dispatch event to sync with other useLocalStorage hooks on the same page.
              window.dispatchEvent(new Event("local-storage"));
            },
            (e) => e as Error
          )().mapErr((error) => {
            console.warn(
              `[useLocalStorage] Error setting localStorage key “${key}”:`,
              error
            );
          });
        }
        return valueToStore;
      });
    },
    [key]
  );

  // This effect is problematic if `initialValue` is not stable.
  // It's the cause of the previous bug. We'll keep it but only with `key` as a dependency
  // to handle the edge case of the key changing, which makes the hook more robust without causing loops.
  useEffect(() => {
    setStoredValue(readValueFromStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (event: Event): void => {
      if (typeof window === "undefined") return;
      let shouldReRead = false;
      if (event instanceof StorageEvent) {
        if (event.key === null || event.key === key) {
          shouldReRead = true;
        }
      } else if (event.type === "local-storage") {
        shouldReRead = true;
      }

      if (shouldReRead) {
        setStoredValue(readValueFromStorage());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
