import React, { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { cn } from "@/src/lib/utils";

interface Location {
  place: string;
  lat: number;
  lng: number;
}

interface Disruption {
  id: string;
  type: string;
  severity: number;
  location: Location;
  radiusKm: number;
}

interface RoutePath {
  id: string;
  name: string;
  coordinates: [number, number][];
}

interface RouteScore {
  routeId: string;
  status: "CHOSEN" | "ALTERNATIVE" | "DISQUALIFIED";
}

interface MapProps {
  routes: RoutePath[];
  disruptions: Disruption[];
  scores: RouteScore[];
  selectedRouteId?: string;
  truckPos?: [number, number];
  dynamicRoutes?: any[];
  searchMarkers?: { start?: [number, number]; end?: [number, number] };
  center?: [number, number];
  onMapClick?: (latlng: [number, number]) => void;
}

export const LogisticsMap: React.FC<MapProps> = ({ 
  routes, 
  disruptions, 
  scores, 
  selectedRouteId, 
  truckPos, 
  dynamicRoutes, 
  searchMarkers, 
  center, 
  onMapClick 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    const initMap = async () => {
      try {
        setOptions({
          apiKey: (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
        });

        // Load required libraries
        await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
          importLibrary("geometry")
        ]);

        const google = (window as any).google;
        
        if (mapRef.current) {
          const newMap = new google.maps.Map(mapRef.current, {
            center: { lat: 23.5120, lng: 80.3290 },
            zoom: 5,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          });

          // Add Traffic Layer
          const trafficLayer = new google.maps.TrafficLayer();
          trafficLayer.setMap(newMap);

          setMap(newMap);

          // Click handler
          newMap.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng && onMapClick) {
              onMapClick([e.latLng.lat(), e.latLng.lng()]);
            }
          });
        }
      } catch (e) {
        console.error("Failed to load Google Maps:", e);
      }
    };

    initMap();
  }, []);

  // Update center
  useEffect(() => {
    if (map && center) {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(10);
    }
  }, [map, center]);

  // Update Markers & Polylines
  useEffect(() => {
    if (!map) return;

    // Clear prev
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];

    // Search Markers
    if (searchMarkers?.start) {
      const m = new google.maps.Marker({
        position: { lat: searchMarkers.start[0], lng: searchMarkers.start[1] },
        map,
        label: "S",
        title: "Origin"
      });
      markersRef.current.push(m);
    }
    if (searchMarkers?.end) {
      const m = new google.maps.Marker({
        position: { lat: searchMarkers.end[0], lng: searchMarkers.end[1] },
        map,
        label: "D",
        title: "Destination"
      });
      markersRef.current.push(m);
    }

    // Dynamic Routes
    if (dynamicRoutes) {
      const bounds = new google.maps.LatLngBounds();
      dynamicRoutes.forEach(route => {
        const path = google.maps.geometry.encoding.decodePath(route.polyline);
        
        // Color coding: Optimized -> Green, Risk -> Red, Alternative -> Blue
        const color = route.classification === "Optimized" ? "#22c55e" : 
                      route.classification === "Risk" ? "#ef4444" : "#3b82f6";
        
        const isSelected = selectedRouteId === route.id;
        
        const poly = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: isSelected ? 1.0 : 0.4,
          strokeWeight: isSelected ? 8 : 4,
          map
        });

        if (isSelected) {
          path.forEach(p => bounds.extend(p));
          map.fitBounds(bounds, 50);
        }

        polylinesRef.current.push(poly);
      });
    }

    // Disruptions
    disruptions.forEach(d => {
      const circle = new google.maps.Circle({
        strokeColor: "#FF4E00",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#FF4E00",
        fillOpacity: 0.15,
        map,
        center: { lat: d.location.lat, lng: d.location.lng },
        radius: d.radiusKm * 1000,
      });
      circlesRef.current.push(circle);
    });

  }, [map, dynamicRoutes, searchMarkers, disruptions, selectedRouteId]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-natural-border relative">
      <div ref={mapRef} className="w-full h-full" />
      
      {!map && (
        <div className="absolute inset-0 flex items-center justify-center bg-natural-surface/50 backdrop-blur-sm z-50">
          <div className="text-xs font-bold uppercase text-natural-primary animate-pulse">Initializing Visualization Core...</div>
        </div>
      )}
    </div>
  );
};
