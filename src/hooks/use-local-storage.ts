
"use client";

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = (value: T | ((val: T) => T)) => void;

// Reviver function to convert ISO date strings to Date objects
const dateReviver = (key: string, value: any): any => {
  // Regular expression to check if the string is in ISO 8601 format
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (typeof value === 'string' && isoDatePattern.test(value)) {
    return new Date(value);
  }
  return value;
};

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = useCallback((): T => {
    // Prevent build errors from localStorage access
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      // Use the dateReviver when parsing JSON
      return item ? (JSON.parse(item, dateReviver) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: SetValue<T> = useCallback(
    (value) => {
      // Prevent build errors from localStorage access
      if (typeof window === 'undefined') {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`
        );
      }

      try {
        // Allow value to be a function so we have same API as useState
        const newValue = value instanceof Function ? value(storedValue) : value;
        // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(newValue));
        // Save state
        setStoredValue(newValue);
        // We dispatch a custom event so every useLocalStorage hook are notified
        window.dispatchEvent(new Event("local-storage"));
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue]
  );
  
  useEffect(() => {
    setStoredValue(readValue());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); //readValue should be stable if initialValue and key are stable.

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      // Check if the event is a StorageEvent and if the key matches
      const eventKey = (e as StorageEvent)?.key;
      if (eventKey && eventKey !== key) {
        return;
      }
      // If it's a local-storage custom event or a matching StorageEvent, re-read the value
      setStoredValue(readValue());
    };

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    // Listen for local-storage changes from the current tab/window (custom event)
    window.addEventListener('local-storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, readValue]); // Re-run if key or readValue changes.


  return [storedValue, setValue];
}

export default useLocalStorage;
