// src/components/game/cards/rehydrators.ts

// Import each card's rehydrator module.
// This ensures their `registerCardRehydrator` calls are executed.
import "./price-card/priceCardRehydrator";
import "./profile-card/profileCardRehydrator";

// Add imports for future card rehydrators here
// e.g., import "./news-card/newsCardRehydrator";
