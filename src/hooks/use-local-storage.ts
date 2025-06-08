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
      setStoredValue((prevValue) => {
        const valueToStore =
          valueOrFn instanceof Function ? valueOrFn(prevValue) : valueOrFn;

        if (typeof window !== "undefined") {
          Result.fromThrowable(
            () => {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
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

  useEffect(() => {
    setStoredValue(readValueFromStorage());
  }, [key, readValueFromStorage]);

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
        // By wrapping the update in a setTimeout, we yield to the main thread,
        // preventing the synchronous parsing from blocking the UI.
        setTimeout(() => {
          setStoredValue(readValueFromStorage());
        }, 0);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, readValueFromStorage]);

  return [storedValue, setValue];
}

export default useLocalStorage;
