// src/components/ui/WorldMap.tsx
"use client";

import { useMemo, useState, useEffect, memo, useCallback, type FC } from "react";
import { Option } from "effect";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { getFlagEmoji } from "@/lib/utils";

// --- Props and Data Structures ---
export interface MapMarker {
  countryCode: string;
  label: string; // Exchange code, e.g., "NASDAQ"
  countryName?: string | null; // Country name for tooltip, e.g., "United States"
}

interface WorldMapProps {
  markers: readonly MapMarker[];
  className?: string;
}

// --- Marker Icon Creation ---
// We create a custom icon to replace Leaflet's default blue one.
const createCustomIcon = () => {
  return new L.Icon({
    iconUrl:
      "data:image/svg+xml;base64," +
      btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <circle cx="12" cy="12" r="8" fill="hsl(var(--primary) / 0.8)" stroke="hsl(var(--primary))" stroke-width="2" />
      </svg>
    `),
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
};

const customIcon = createCustomIcon();

// Separate component for markers that uses useMap hook to ensure map context is available
// CRITICAL: This component must only render when map is fully ready to prevent _leaflet_pos errors
const MarkersLayer: FC<{ markers: { label: string; position: [number, number]; countryCode: string; countryName?: string | null }[] }> = ({ markers }) => {
  const map = useMap();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!map) {
      // Schedule state update to avoid cascading renders
      queueMicrotask(() => {
        setIsReady(false);
      });
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    // Wait for map to be fully ready
    const checkReady = () => {
      try {
        const container = map.getContainer();
        if (!container || !container.parentElement) {
          return;
        }

        // Check if marker pane exists and is in the DOM
        const markerPane = map.getPane('markerPane');
        if (!markerPane || !markerPane.parentNode) {
          return;
        }

        // Additional check: verify the pane has the expected structure
        if (markerPane instanceof HTMLElement) {
          if (isMounted) {
            setIsReady(true);
          }
        }
      } catch (error) {
        console.warn('Error checking map readiness:', error);
      }
    };

    // Use whenReady to ensure map is initialized
    map.whenReady(() => {
      if (!isMounted) return;

      // Double-check after a small delay to ensure DOM is fully ready
      timer = setTimeout(() => {
        if (isMounted) {
          checkReady();
        }
      }, 100);
    });

    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
      setIsReady(false);
    };
  }, [map]);

  // Don't render anything until map is fully ready
  if (!isReady || !map) {
    return null;
  }

  // Final safety check before rendering markers
  try {
    const container = map.getContainer();
    const markerPane = map.getPane('markerPane');

    if (!container || !container.parentElement || !markerPane || !markerPane.parentNode) {
      return null;
    }
  } catch (error) {
    console.warn('Error in MarkersLayer safety check:', error);
    return null;
  }

  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={marker.label}
          position={marker.position as L.LatLngExpression}
          icon={customIcon}>
          <Tooltip>
            <span className="font-bold flex items-center">
              <span className="mr-2">{getFlagEmoji(marker.countryCode)}</span>
              <span>
                {marker.label}
                {marker.countryName && (
                  <span className="block text-xs font-normal mt-1">
                    {marker.countryName}
                  </span>
                )}
              </span>
            </span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
};

// --- Coordinate Mapping ---
const locationCoordinates: Record<string, [number, number]> = {
  NYSE: [40.7069, -74.0118],
  NASDAQ: [40.7069, -74.0118],
  AMEX: [40.7069, -74.0118],
  CBOE: [41.8781, -87.6298],
  TSX: [43.6532, -79.3832],
  TSXV: [51.0447, -114.0719],
  NEO: [43.6532, -79.3832],
  CNQ: [43.6532, -79.3832],
  ICE: [33.749, -84.388],
  OTC: [40.758, -73.9855],
  MEX: [19.4326, -99.1455],
  BVC: [4.711, -74.0721],
  BUE: [-34.6037, -58.3816],
  SAO: [-23.5505, -46.6333],
  SGO: [-33.4489, -70.6693],
  LSE: [51.5155, -0.0797],
  AMS: [52.3702, 4.8952],
  BRU: [50.8503, 4.3517],
  DUB: [53.3498, -6.2603],
  LIS: [38.7223, -9.1393],
  PAR: [48.8566, 2.3522],
  XETRA: [50.1109, 8.6821],
  FSX: [50.1109, 8.6821], // Frankfurt Stock Exchange (same location as XETRA)
  BER: [52.52, 13.405],
  DUS: [51.2277, 6.7735],
  HAM: [53.5511, 9.9937],
  MUN: [48.1351, 11.582],
  STU: [48.7758, 9.1829],
  SIX: [47.3769, 8.5417],
  STO: [59.3293, 18.0686],
  OSL: [59.9139, 10.7522],
  CPH: [55.6761, 12.5683],
  HEL: [60.1699, 24.9384],
  RIS: [56.9496, 24.1052],
  TAL: [59.437, 24.7536],
  WSE: [52.2297, 21.0122],
  PRA: [50.0755, 14.4378],
  VIE: [48.2082, 16.3738],
  BUD: [47.4979, 19.0402],
  ATH: [37.9838, 23.7275],
  IST: [41.0082, 28.9784],
  MIL: [45.4642, 9.19],
  BME: [40.4168, -3.7038],
  JPX: [35.6895, 139.6917],
  HKSE: [22.3193, 114.1694],
  SHH: [31.2304, 121.4737],
  SHZ: [22.5431, 114.0579],
  TAI: [25.033, 121.5654],
  NSE: [19.076, 72.8777],
  BSE: [19.076, 72.8777],
  MCX: [19.076, 72.8777],
  SES: [1.3521, 103.8198],
  KLS: [3.139, 101.6869],
  JKT: [-6.2088, 106.8456],
  HOSE: [10.7769, 106.7018],
  SET: [13.7563, 100.5018],
  KUW: [29.3759, 47.9774],
  SAU: [24.7136, 46.6753],
  DOH: [25.2854, 51.531],
  DFM: [25.2048, 55.2708],
  TLV: [32.0853, 34.7818],
  JNB: [-26.2041, 28.0473],
  EGX: [30.0444, 31.2357],
  ASX: [-33.8688, 151.2093],
  NZE: [-41.2924, 174.7787],
  AQS: [51.5155, -0.0797],
};

// --- Main Component ---
export const WorldMap: FC<WorldMapProps> = memo(({ markers, className }) => {
  const [map, setMap] = useState<Option.Option<L.Map>>(Option.none());
  const [isMapReady, setIsMapReady] = useState(false);

  const validMarkers = useMemo(
    () =>
      markers
        .map((m) => ({ ...m, position: locationCoordinates[m.label] }))
        .filter((m) => m.position),
    [markers]
  );

  const mapBounds = useMemo(() => {
    if (validMarkers.length === 0) return undefined;
    const latLngs = validMarkers.map((m) => m.position as L.LatLngExpression);
    return L.latLngBounds(latLngs);
  }, [validMarkers]);

  // Handle map initialization
  // NOTE: React-Leaflet's MapContainer handles map cleanup automatically.
  // We only need to track the map instance for our own state management.
  const handleMapRef = useCallback((mapInstance: L.Map | null) => {
    if (mapInstance) {
      // Wait for map to be fully ready before setting state
      mapInstance.whenReady(() => {
        // Verify map container is still valid before setting state
        const container = mapInstance.getContainer();
        if (container && container.parentElement) {
          setIsMapReady(true);
          setMap(Option.some(mapInstance));
        }
      });
    } else {
      // Map is being unmounted - just reset our state
      // React-Leaflet will handle the actual cleanup
      setIsMapReady(false);
      setMap(Option.none());
    }
  }, []);


  useEffect(() => {
    if (Option.isNone(map) || !isMapReady || !mapBounds) return;

    // Check if map container is still valid
    const mapInstance = map.value;
    const container = mapInstance.getContainer();
    if (!container || !container.parentElement) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let rafId: number | null = null;

    try {
      // Use requestAnimationFrame to ensure DOM is ready
      rafId = requestAnimationFrame(() => {
        // Double-check map container is still valid
        if (Option.isNone(map)) return;
        const currentMapInstance = map.value;
        const currentContainer = currentMapInstance.getContainer();
        if (!currentContainer || !currentContainer.parentElement) {
          return;
        }

        try {
          // Invalidate size first to ensure container dimensions are correct
          currentMapInstance.invalidateSize();

          // Small delay to ensure invalidateSize has taken effect
          timeoutId = setTimeout(() => {
            if (Option.isNone(map) || !mapBounds) return;
            const finalMapInstance = map.value;
            const finalContainer = finalMapInstance.getContainer();
            if (!finalContainer || !finalContainer.parentElement) {
              return;
            }
            try {
              finalMapInstance.fitBounds(mapBounds, { padding: [50, 50] });
            } catch (error) {
              console.warn("Error fitting map bounds:", error);
            }
          }, 100);
        } catch (error) {
          console.warn("Error invalidating map size:", error);
        }
      });
    } catch (error) {
      console.warn("Error in map update effect:", error);
    }

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [map, isMapReady, mapBounds]);

  // Memoize the layers to prevent re-creating them on every render
  // Only render layers when map is ready to prevent Leaflet DOM access errors
  const displayLayers = useMemo(() => {
    if (!isMapReady || Option.isNone(map)) {
      return null;
    }

    return (
      <>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkersLayer markers={validMarkers} />
      </>
    );
  }, [validMarkers, isMapReady, map]);

  return (
    <div
      className={cn(
        "w-full h-full bg-background rounded-lg border overflow-hidden",
        className
      )}>
      <MapContainer
        ref={handleMapRef}
        center={[20, 0]}
        zoom={2}
        bounds={mapBounds}
        boundsOptions={{ padding: [50, 50] }}
        style={{
          height: "100%",
          width: "100%",
          backgroundColor: "transparent",
        }}
        zoomControl={false}
        scrollWheelZoom={true}
        dragging={true}>
        {displayLayers}
      </MapContainer>
    </div>
  );
});

WorldMap.displayName = "WorldMap";
