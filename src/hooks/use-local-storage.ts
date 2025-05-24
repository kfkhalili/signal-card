// src/hooks/use-local-storage.ts
"use client";

import { useState, useEffect, useCallback } from "react";

type SetValue<T> = (value: T | ((val: T) => T)) => void;

// Reviver function to convert ISO date strings to Date objects
const dateReviver = (value: unknown): unknown => {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (typeof value === "string" && isoDatePattern.test(value)) {
    return new Date(value);
  }
  return value;
};

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item, dateReviver) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

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
          window.dispatchEvent(new Event("local-storage")); // Dispatch custom event

          return newValue;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key]
  );

  // Effect to sync state from localStorage when key or initialValue (via readValue) changes
  useEffect(() => {
    setStoredValue((currentVal) => {
      const valFromStorage = readValue();
      // Only update if the stringified value has actually changed
      // This prevents updates if readValue() returns a new reference to an identical object/array
      if (JSON.stringify(currentVal) !== JSON.stringify(valFromStorage)) {
        return valFromStorage;
      }
      return currentVal;
    });
  }, [readValue]); // Runs when readValue reference changes (i.e. initialValue or key changes)

  // Effect to listen for storage events from other tabs/windows or custom events
  useEffect(() => {
    const handleStorageChange = (event: Event): void => {
      if (typeof window === "undefined") return;

      let shouldAttemptRead = false;
      if (event instanceof StorageEvent) {
        // Standard 'storage' event from other tabs/windows
        if (event.key === key) {
          shouldAttemptRead = true;
        }
      } else if (event.type === "local-storage") {
        // Custom 'local-storage' event dispatched by setValue in this or another instance of the hook
        // We always attempt to re-read to ensure synchronization,
        // but the setStoredValue below will guard against unnecessary updates.
        shouldAttemptRead = true;
      }

      if (shouldAttemptRead) {
        setStoredValue((currentVal) => {
          const valFromStorage = readValue();
          // Only update if the stringified value has actually changed
          if (JSON.stringify(currentVal) !== JSON.stringify(valFromStorage)) {
            return valFromStorage;
          }
          return currentVal;
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, readValue]); // readValue reference is stable if initialValue & key are stable.

  return [storedValue, setValue];
}

export default useLocalStorage;
