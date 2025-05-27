// src/hooks/use-local-storage.ts
"use client";

import { useState, useEffect, useCallback } from "react";

type SetValue<T> = (value: T | ((val: T) => T)) => void;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    const item = window.localStorage.getItem(key);
    if (!item) {
      return initialValue;
    }
    try {
      // Parse WITHOUT the dateReviver for the main localStorage item
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(
        `[useLocalStorage] Error parsing localStorage item for key “${key}”. Error:`,
        error
      );
      console.error(`[useLocalStorage] Item that failed to parse:`, item);
      return initialValue;
    }
  });

  const setValue: SetValue<T> = useCallback(
    (valueOrFn) => {
      if (typeof window === "undefined") {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`
        );
        return;
      }
      try {
        setStoredValue((currentState) => {
          const newValue =
            typeof valueOrFn === "function"
              ? (valueOrFn as (val: T) => T)(currentState)
              : valueOrFn;
          window.localStorage.setItem(key, JSON.stringify(newValue));
          window.dispatchEvent(new Event("local-storage")); // For cross-tab sync if needed
          return newValue;
        });
      } catch (error) {
        console.warn(
          `[useLocalStorage] Error setting localStorage key “${key}”:`,
          error
        );
      }
    },
    [key]
  );

  // Read value for effects, also without the top-level reviver
  const readValueForEffects = useCallback((): T => {
    if (typeof window === "undefined") return initialValue;
    const item = window.localStorage.getItem(key);
    if (!item) return initialValue;
    try {
      return JSON.parse(item) as T; // Parse WITHOUT reviver
    } catch {
      return initialValue;
    }
  }, [initialValue, key]);

  useEffect(() => {
    const handleStorageChange = (event: Event): void => {
      if (typeof window === "undefined") return;
      let shouldReRead = false;
      if (event instanceof StorageEvent) {
        // Standard 'storage' event from other tabs/windows
        // event.key is null if localStorage.clear() was called
        if (event.key === null || event.key === key) {
          shouldReRead = true;
        }
      } else if (event.type === "local-storage") {
        // Custom 'local-storage' event from setValue in the same tab or other instances of the hook
        shouldReRead = true;
      }

      if (shouldReRead) {
        setStoredValue(readValueForEffects());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, initialValue, readValueForEffects]); // readValueForEffects is stable if initialValue/key are

  return [storedValue, setValue];
}

export default useLocalStorage;
