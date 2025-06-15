// src/components/ui/WorldMap.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { cn } from "@/lib/utils";
import { getFlagEmoji } from "@/lib/utils";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export interface MapMarker {
  countryCode: string;
  label: string; // This will now be the exchange code, e.g., "NASDAQ"
}

interface WorldMapProps {
  markers: readonly MapMarker[];
  className?: string;
}

const locationCoordinates: Record<string, [number, number]> = {
  // North America
  NYSE: [-74.0118, 40.7069],
  NASDAQ: [-74.0118, 40.7069],
  AMEX: [-74.0118, 40.7069],
  CBOE: [-87.6298, 41.8781],
  TSX: [-79.3832, 43.6532],
  TSXV: [-114.0719, 51.0447],
  NEO: [-79.3832, 43.6532],
  CNQ: [-79.3832, 43.6532],
  ICE: [-84.388, 33.749],
  OTC: [-73.9855, 40.758],
  MEX: [-99.1455, 19.4326],
  // South America
  BVC: [-74.0721, 4.711],
  BUE: [-58.3816, -34.6037],
  SAO: [-46.6333, -23.5505],
  SGO: [-70.6693, -33.4489],
  // Europe
  LSE: [-0.0797, 51.5155],
  AMS: [4.8952, 52.3702],
  BRU: [4.3517, 50.8503],
  DUB: [-6.2603, 53.3498],
  LIS: [-9.1393, 38.7223],
  PAR: [2.3522, 48.8566],
  XETRA: [8.6821, 50.1109],
  BER: [13.405, 52.52],
  DUS: [6.7735, 51.2277],
  HAM: [9.9937, 53.5511],
  MUN: [11.582, 48.1351],
  STU: [9.1829, 48.7758],
  SIX: [8.5417, 47.3769],
  STO: [18.0686, 59.3293],
  OSL: [10.7522, 59.9139],
  CPH: [12.5683, 55.6761],
  HEL: [24.9384, 60.1699],
  RIS: [24.1052, 56.9496],
  TAL: [24.7536, 59.437],
  WSE: [21.0122, 52.2297],
  PRA: [14.4378, 50.0755],
  VIE: [16.3738, 48.2082],
  BUD: [19.0402, 47.4979],
  ATH: [23.7275, 37.9838],
  IST: [28.9784, 41.0082],
  MIL: [9.19, 45.4642],
  BME: [-3.7038, 40.4168],
  // Asia & Middle East
  JPX: [139.6917, 35.6895],
  HKSE: [114.1694, 22.3193],
  SHH: [121.4737, 31.2304],
  SHZ: [114.0579, 22.5431],
  TAI: [121.5654, 25.033],
  NSE: [72.8777, 19.076],
  BSE: [72.8777, 19.076],
  MCX: [72.8777, 19.076],
  SES: [103.8198, 1.3521],
  KLS: [101.6869, 3.139],
  JKT: [106.8456, -6.2088],
  HOSE: [106.7018, 10.7769],
  SET: [100.5018, 13.7563],
  KUW: [47.9774, 29.3759],
  SAU: [46.6753, 24.7136],
  DOH: [51.531, 25.2854],
  DFM: [55.2708, 25.2048],
  TLV: [34.7818, 32.0853],
  // Africa & Oceania
  JNB: [28.0473, -26.2041],
  EGX: [31.2357, 30.0444],
  ASX: [151.2093, -33.8688],
  NZE: [174.7787, -41.2924],
  // Others
  AQS: [-0.0797, 51.5155],
};

export const WorldMap: React.FC<WorldMapProps> = ({ markers, className }) => {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [position, setPosition] = useState({
    key: "default",
    coordinates: [0, 20] as [number, number],
    zoom: 1,
  });

  useEffect(() => {
    const validMarkers = markers.filter((m) => locationCoordinates[m.label]);
    if (validMarkers.length === 0) {
      setPosition({ key: "default", coordinates: [0, 20], zoom: 1 });
      return;
    }

    const markerCoordinates = validMarkers.map(
      (m) => locationCoordinates[m.label]
    );

    if (markerCoordinates.length === 1) {
      setPosition({
        key: validMarkers[0].label,
        coordinates: markerCoordinates[0],
        zoom: 4,
      });
      return;
    }

    const longitudes = markerCoordinates.map((c) => c[0]);
    const latitudes = markerCoordinates.map((c) => c[1]);

    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);

    let centerLon = (minLon + maxLon) / 2;
    const lonDiff = maxLon - minLon;

    if (lonDiff > 180) {
      const adjustedLons = longitudes.map((lon) => (lon < 0 ? lon + 360 : lon));
      centerLon = (Math.min(...adjustedLons) + Math.max(...adjustedLons)) / 2;
      if (centerLon > 180) {
        centerLon -= 360;
      }
    }

    const centerLat = (minLat + maxLat) / 2;
    const latDiff = maxLat - minLat;

    const maxSpread = Math.max(lonDiff, latDiff);
    let zoom;
    if (maxSpread < 20) {
      zoom = 6;
    } else if (maxSpread < 60) {
      zoom = 4;
    } else if (maxSpread < 120) {
      zoom = 3;
    } else {
      zoom = 2;
    }

    setPosition({
      key: validMarkers.map((m) => m.label).join("-"),
      coordinates: [centerLon, centerLat],
      zoom: zoom,
    });
  }, [markers]);

  return (
    <div
      className={cn(
        "w-full h-full bg-background rounded-lg border",
        className
      )}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 110,
        }}
        style={{ width: "100%", height: "100%" }}>
        <ZoomableGroup
          key={position.key}
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={position.zoom}
          maxZoom={position.zoom}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className="fill-muted outline-none"
                  style={{
                    // By making the geographies non-interactive, we prevent panning by dragging them
                    // while still allowing hover events on the markers which are rendered on top.
                    default: { pointerEvents: "none" },
                    hover: { pointerEvents: "none" },
                    pressed: { pointerEvents: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {markers.map((marker) => {
            const { countryCode, label } = marker;
            const coords = locationCoordinates[label];
            if (!coords) {
              console.warn(`No coordinates found for exchange: ${label}`);
              return null;
            }
            return (
              <Marker key={label} coordinates={coords}>
                <circle
                  r={5}
                  className="fill-primary/50 stroke-primary/80 stroke-2 cursor-pointer transition-all hover:fill-primary"
                  onMouseEnter={() => setActiveLabel(label)}
                  onMouseLeave={() => setActiveLabel(null)}
                />
                {activeLabel === label && (
                  <g
                    transform="translate(0, -15)"
                    className="pointer-events-none">
                    <rect
                      x={-((label.length + 4) * 4)}
                      y={-22}
                      width={(label.length + 4) * 8}
                      height={24}
                      rx="4"
                      className="fill-popover stroke-border"
                    />
                    <text
                      textAnchor="middle"
                      y={-4}
                      className="text-xs font-bold fill-popover-foreground">
                      {getFlagEmoji(countryCode)} {label}
                    </text>
                  </g>
                )}
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};
