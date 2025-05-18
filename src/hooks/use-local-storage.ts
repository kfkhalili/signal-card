"use client";

import { useState, useEffect, useCallback } from "react";

type SetValue<T> = (value: T | ((val: T) => T)) => void;

// Reviver function to convert ISO date strings to Date objects
const dateReviver = (key: string, value: unknown): unknown => {
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
    (value) => {
      if (typeof window === "undefined") {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`
        );
        return; // Early return if not in client environment
      }

      try {
        const newValue = value instanceof Function ? value(storedValue) : value;
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue);
        window.dispatchEvent(new Event("local-storage")); // Dispatch a generic Event
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue]
  );

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  useEffect(() => {
    const handleStorageChange = (event: Event): void => {
      // Handler for standard "storage" events from other tabs/windows
      if (event instanceof StorageEvent) {
        // Only update if the key matches for "storage" events
        if (event.key === key) {
          setStoredValue(readValue());
        }
      }
      // Handler for custom "local-storage" event dispatched by this hook's setValue
      else if (event.type === "local-storage") {
        // This event signifies that any instance of useLocalStorage might have updated.
        // Re-read to sync.
        setStoredValue(readValue());
      }
    };

    // Add event listener for standard 'storage' events
    window.addEventListener("storage", handleStorageChange);
    // Add event listener for custom 'local-storage' events
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, readValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
