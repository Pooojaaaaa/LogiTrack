/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Map as MapIcon, 
  Zap, 
  Activity, 
  ShieldAlert, 
  Clock, 
  DollarSign, 
  CloudLightning, 
  Route, 
  RotateCcw,
  Search,
  MessageSquareQuote
} from 'lucide-react';
import { LogisticsMap } from './components/Map';
import { cn } from './lib/utils';
import { getAIExplanation } from './services/geminiService';
import { AdvancedRoutePlanner } from './components/AdvancedRoutePlanner';
import { RouteComparisonPanel } from './components/RouteComparisonPanel';

interface Location {
  place: string;
  lat: number;
  lng: number;
}

interface Disruption {
  id: string;
  type: "WEATHER" | "TRAFFIC" | "ROAD_CLOSURE";
  severity: number;
  location: Location;
  radiusKm: number;
  confidence: number;
}

interface RoutePath {
  id: string;
  name: string;
  coordinates: [number, number][];
  distanceKm: number;
  baseDurationMin: number;
}

interface RouteScore {
  routeId: string;
  riskPenalty: number;
  delayMin: number;
  totalCost: number;
  isDisqualified: boolean;
  status: "CHOSEN" | "ALTERNATIVE" | "DISQUALIFIED";
}

export default function App() {
  const [routes, setRoutes] = useState<RoutePath[]>([]);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [scores, setScores] = useState<RouteScore[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [meta, setMeta] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dynamicRoutes, setDynamicRoutes] = useState<any[]>([]);
  const [selectedDynamicRouteId, setSelectedDynamicRouteId] = useState<string>("");
  const [searchMarkers, setSearchMarkers] = useState<{ start?: [number, number]; end?: [number, number] }>({});
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.5120, 80.3290]);

  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initial fetch
    fetch('/api/state')
      .then(res => res.json())
      .then(data => {
        setRoutes(data.routes);
        setDisruptions(data.disruptions);
      });

    // Setup WebSockets
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.current = new WebSocket(`${protocol}//${window.location.host}`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWsMessage(data);
    };

    return () => ws.current?.close();
  }, []);

  const handleWsMessage = (data: any) => {
    switch (data.type) {
      case 'PIPELINE_START':
        setIsOptimizing(true);
        break;
      case 'ROUTES_SCORED':
        setScores(data.scores);
        break;
      case 'OPTIMIZATION_RESULT':
        setIsOptimizing(false);
        setSelectedRouteId(data.selectedRouteId);
        setScores(data.scores);
        setMeta(data.meta);
        
        // Finalize explanation via frontend Gemini
        if (!data.explanation) {
          const routes_ = (data as any).routes || routes; // Fallback to current state routes if not in payload
          const route = routes_.find((r: any) => r.id === data.selectedRouteId);
          const score = data.scores.find((s: any) => s.routeId === data.selectedRouteId);
          if (route && score) {
            getAIExplanation(route, score, disruptions).then(setExplanation);
          }
        } else {
          setExplanation(data.explanation);
        }
        break;
      case 'CHAOS_EVENT':
        setDisruptions(prev => [...prev, data.disruption]);
        break;
      case 'STATE_RESET':
        setDisruptions(prev => prev.filter(d => !d.id.startsWith('chaos-')));
        break;
    }
  };

  const handleSmartRouteFound = (data: { routes: any[], bestRoute: any, start: [number, number], end: [number, number] }) => {
    setDynamicRoutes(data.routes);
    setSelectedDynamicRouteId(data.bestRoute.id);
    setSearchMarkers({ start: data.start, end: data.end });
    setMapCenter(data.start);
  };

  const handleMapClick = (latlng: [number, number]) => {
    if (!searchMarkers.start) {
      setSearchMarkers({ ...searchMarkers, start: latlng });
    } else if (!searchMarkers.end) {
      setSearchMarkers({ ...searchMarkers, end: latlng });
    } else {
      setSearchMarkers({ start: latlng });
      setDynamicRoutes([]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery("");
  };

  return (
    <div className="h-screen bg-natural-bg text-natural-text font-sans flex flex-col overflow-hidden selection:bg-natural-surface">
      {/* Navigation / Header */}
      <nav className="h-16 border-b border-natural-border bg-white flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-natural-primary rounded-sm flex items-center justify-center text-white">
            <div className="w-4 h-4 border-2 border-white rotate-45" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight uppercase">
            LogiPredict <span className="font-light opacity-50 uppercase">| Optimization Engine</span>
          </h1>
        </div>

        <div className="flex gap-6 items-center">
          {/* Action buttons removed for cleanup */}
        </div>
      </nav>

      {/* Top Input Panel: Intelligent Routing Controls */}
      <AdvancedRoutePlanner 
        onRouteFound={handleSmartRouteFound} 
        isLoadingExternal={isOptimizing}
        setIsLoadingExternal={setIsOptimizing}
        externalStart={searchMarkers.start ? { name: `${searchMarkers.start[0].toFixed(2)}, ${searchMarkers.start[1].toFixed(2)}`, coords: [searchMarkers.start[1], searchMarkers.start[0]] } : null}
        externalEnd={searchMarkers.end ? { name: `${searchMarkers.end[0].toFixed(2)}, ${searchMarkers.end[1].toFixed(2)}`, coords: [searchMarkers.end[1], searchMarkers.end[0]] } : null}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Detailed Analytics */}
        <div className="w-80 flex flex-col bg-white border-r border-natural-border overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            
            {/* ROI Optimization Summary */}
            <div className="space-y-4">
              <h2 className="text-[10px] font-bold uppercase text-natural-primary tracking-widest border-b border-natural-border pb-2">ROI Analytics</h2>
              <div className="grid grid-cols-1 gap-3">
                <SummaryItem label="Hours Saved" value={meta?.hoursSaved ? `${meta.hoursSaved}h` : "14.2h"} />
                <SummaryItem label="Risk Reduction" value={meta?.riskReduction || "62.4%"} />
                <SummaryItem label="Value Protected" value={meta?.valueProtected || "$842k"} isPrimary />
                <div className="bg-[#F9F9F7] p-3 rounded-lg border border-natural-border">
                  <span className="text-[10px] uppercase text-natural-muted block">Vulnerability Mask</span>
                  <span className="text-lg font-bold text-natural-accent uppercase">ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Static Route Scores (Legacy List) */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold uppercase text-natural-primary tracking-widest border-b border-natural-border pb-2">H3 Cell Contexts</h2>
              <div className="space-y-2">
                {routes.map((route) => {
                  const score = scores.find(s => s.routeId === route.id);
                  const isSelected = selectedRouteId === route.id;
                  return (
                    <div 
                      key={`legacy-${route.id}`}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={cn(
                        "group p-2.5 rounded border transition-all cursor-pointer",
                        isSelected ? "bg-natural-surface/50 border-natural-primary shadow-sm" : "bg-white border-natural-border/30 hover:bg-natural-bg"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-[10px] text-natural-primary uppercase truncate w-2/3">{route.name}</span>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full mt-1",
                          score?.status === "CHOSEN" ? "bg-green-500" : 
                          score?.status === "DISQUALIFIED" ? "bg-red-500" : "bg-natural-muted opacity-40"
                        )} />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-natural-muted">
                        <span>{route.distanceKm}KM</span>
                        <span>{score?.totalCost ? `$${score.totalCost.toFixed(0)}` : 'Wait...'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Central Map: BIG INTERACTIVE VIEW */}
        <div className="flex-1 relative bg-natural-surface overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#5A5A40_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none z-10" />
          <LogisticsMap 
            routes={routes} 
            disruptions={disruptions} 
            scores={scores} 
            selectedRouteId={selectedDynamicRouteId || selectedRouteId}
            truckPos={[28.6139, 77.2090]}
            dynamicRoutes={dynamicRoutes}
            searchMarkers={searchMarkers}
            center={mapCenter}
            onMapClick={handleMapClick}
          />

          {/* Intelligence stream removed Scan gloomily Scan */}

          {/* Legend Float */}
          <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-natural-border">
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "Optimized Path", color: "bg-green-500" },
                  { label: "Alternative Vector", color: "bg-blue-500" },
                  { label: "Disruption Risk", color: "bg-red-500" }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", item.color)} />
                    <span className="text-[9px] font-bold uppercase text-natural-primary tracking-tight">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Dynamic Route Selection & Deployment */}
        <RouteComparisonPanel 
          routes={dynamicRoutes}
          selectedRouteId={selectedDynamicRouteId}
          onSelect={setSelectedDynamicRouteId}
          isLoading={isOptimizing}
        />
      </main>

      {/* Persistent Status Bar */}
      <footer className="h-10 bg-natural-primary text-white flex items-center px-8 text-[10px] tracking-widest uppercase shrink-0 z-50">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-bold">Grid Synced</span>
          </div>
          <div className="h-4 w-[1px] bg-white/20" />
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span className="opacity-80">Encryption: AES-256</span>
          </div>
          <div className="h-4 w-[1px] bg-white/20" />
          <div className="flex items-center gap-2">
            <CloudLightning className="w-3 h-3" />
            <span className="opacity-80">Geospatial Awareness Enabled</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-8 font-bold">
          <span className="opacity-60 lowercase italic font-normal">v5.3.D-Enterprise</span>
          <div className="h-4 w-[1px] bg-white/20" />
          <span>Logistic Quadrant Beta-Primary</span>
        </div>
      </footer>
    </div>
  );
}

function SummaryItem({ label, value, isPrimary }: { label: string; value: string; isPrimary?: boolean }) {
  return (
    <div className="bg-[#F9F9F7] p-3 rounded-lg border border-natural-surface">
      <span className="text-[10px] uppercase text-natural-muted block mb-1 leading-none">{label}</span>
      <span className={cn(
        "text-xl font-semibold leading-none",
        isPrimary ? "text-natural-primary" : "text-natural-text"
      )}>
        {value}
      </span>
    </div>
  );
}

