// src/app/fonts.ts
import localFont from "next/font/local";

export const geistSansLocal = localFont({
  src: [
    {
      path: "../../fonts/Geist-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/Geist-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMonoLocal = localFont({
  src: [
    {
      path: "../../fonts/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    // Add GeistMono-Bold.woff2 if you decide you need it
    // {
    //   path: '../fonts/GeistMono-Bold.woff2',
    //   weight: '700',
    //   style: 'normal',
    // },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});
