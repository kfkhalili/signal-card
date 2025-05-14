# **App Name**: MarketEcho

## Core Features:

- Data Pipeline: Fetches AAPL price data every 5 minutes from Financial Modeling Prep and broadcasts it via Supabase Realtime.
- Price Card Display: Displays 'Price Cards' with fading timers, allowing users to secure them by clicking. Secured cards stop fading.
- Card Interaction and Combination: Enables users to examine secured 'Price Cards' and generate 'Trend Cards' based on price trends. Also enables the user to combine 2 Price Cards to generate a 'Price Change Signal Card'.

## Style Guidelines:

- Primary color: White or light gray for the background to ensure readability.
- Secondary color: Dark gray or black for text to provide a strong contrast.
- Accent: Blue (#3498db) to highlight interactive elements such as buttons and links.
- Use a clear and functional layout with designated areas for 'Active Cards Area' and 'Discovered Signals Log'.
- Implement a simple opacity change for card fading to indicate the time-sensitive nature of the data.
