import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { Search, MapPin, Navigation, Zap, Clock, Ruler, Loader2, Info, Car, Truck, Train, Plane, Layers } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SearchResult {
  name: string;
  placeId?: string;
  coords: [number, number]; // [lng, lat]
}

interface AdvancedRoutePlannerProps {
  onRouteFound: (data: { routes: any[], bestRoute: any, start: [number, number], end: [number, number] }) => void;
  className?: string;
  externalStart?: SearchResult | null;
  externalEnd?: SearchResult | null;
  isLoadingExternal?: boolean;
  setIsLoadingExternal?: (loading: boolean) => void;
}

export const AdvancedRoutePlanner: React.FC<AdvancedRoutePlannerProps> = ({ 
  onRouteFound, 
  className, 
  externalStart, 
  externalEnd,
  isLoadingExternal,
  setIsLoadingExternal
}) => {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startResults, setStartResults] = useState<any[]>([]);
  const [endResults, setEndResults] = useState<any[]>([]);
  const [selectedStart, setSelectedStart] = useState<SearchResult | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<SearchResult | null>(null);
  const [transport, setTransport] = useState<'car' | 'truck' | 'train' | 'airplane'>('truck');
  const [mode, setMode] = useState<'smart' | 'fastest' | 'shortest'>('smart');
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = isLoadingExternal !== undefined ? isLoadingExternal : internalLoading;
  const setIsLoading = setIsLoadingExternal || setInternalLoading;

  useEffect(() => {
    if (externalStart) {
      setSelectedStart(externalStart);
      setStartQuery(externalStart.name);
    }
  }, [externalStart]);

  useEffect(() => {
    if (externalEnd) {
      setSelectedEnd(externalEnd);
      setEndQuery(externalEnd.name);
    }
  }, [externalEnd]);

  const fetchResults = async (query: string, setResults: (res: any[]) => void) => {
    if (!query || query.length < 3) return;
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectResult = async (result: any, isStart: boolean) => {
    if (result.placeId) {
      try {
        const res = await fetch(`/api/geocode?placeId=${result.placeId}`);
        const data = await res.json();
        const fullResult: SearchResult = { name: result.name, coords: data.coords };
        if (isStart) {
          setSelectedStart(fullResult);
          setStartQuery(fullResult.name);
          setStartResults([]);
        } else {
          setSelectedEnd(fullResult);
          setEndQuery(fullResult.name);
          setEndResults([]);
        }
      } catch (e) {
        setError("Geocoding failed");
      }
    } else {
      // Fallback for demo results
      if (isStart) {
        setSelectedStart(result);
        setStartQuery(result.name);
        setStartResults([]);
      } else {
        setSelectedEnd(result);
        setEndQuery(result.name);
        setEndResults([]);
      }
    }
  };

  const debouncedStartSearch = useCallback(debounce((q) => fetchResults(q, setStartResults), 300), []);
  const debouncedEndSearch = useCallback(debounce((q) => fetchResults(q, setEndResults), 300), []);

  useEffect(() => {
    if (startQuery && !selectedStart) debouncedStartSearch(startQuery);
    else if (!startQuery) setStartResults([]);
  }, [startQuery, selectedStart]);

  useEffect(() => {
    if (endQuery && !selectedEnd) debouncedEndSearch(endQuery);
    else if (!endQuery) setEndResults([]);
  }, [endQuery, selectedEnd]);

  const handleCalculate = async () => {
    if (!selectedStart || !selectedEnd) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/smart-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: selectedStart.coords,
          end: selectedEnd.coords,
          mode,
          transport
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      onRouteFound({
        routes: data.routes,
        bestRoute: data.bestRoute,
        start: [selectedStart.coords[1], selectedStart.coords[0]], // lat, lng
        end: [selectedEnd.coords[1], selectedEnd.coords[0]]
      });
    } catch (e: any) {
      setError(e.message || "Failed to calculate route");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("bg-white border-b border-natural-border shadow-md z-40 px-8 py-3", className)}>
      <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center gap-6">
        
        {/* Origin */}
        <div className="flex-1 min-w-[200px] relative">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3 h-3 text-natural-primary" />
            <label className="text-[10px] uppercase font-bold text-natural-muted">Starting Location</label>
          </div>
          <div className="relative group">
            <input 
              type="text"
              value={startQuery}
              onChange={(e) => {
                setStartQuery(e.target.value);
                if (selectedStart) setSelectedStart(null);
              }}
              placeholder="Enter starting location..."
              className="w-full bg-natural-bg border border-natural-border rounded-lg px-4 py-2 text-xs outline-none focus:border-natural-primary focus:ring-2 focus:ring-natural-primary/10 transition-all font-medium"
            />
            {startResults.length > 0 && !selectedStart && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-natural-border rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar overflow-x-hidden">
                {startResults.map((r, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSelectResult(r, true)}
                    className="px-4 py-3 text-[11px] hover:bg-natural-surface cursor-pointer border-b last:border-0 border-natural-border/50 transition-colors flex flex-col justify-center"
                  >
                    <div className="flex items-center gap-2">
                       <MapPin className="w-3 h-3 text-natural-primary shrink-0" />
                       <span className="font-bold text-natural-primary truncate">{r.name}</span>
                    </div>
                    {r.address && <span className="text-[9px] text-natural-muted mt-0.5 truncate pl-5">{r.address}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Destination */}
        <div className="flex-1 min-w-[200px] relative">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="w-3 h-3 text-natural-accent" />
            <label className="text-[10px] uppercase font-bold text-natural-muted">Destination</label>
          </div>
          <div className="relative group">
            <input 
              type="text"
              value={endQuery}
              onChange={(e) => {
                setEndQuery(e.target.value);
                if (selectedEnd) setSelectedEnd(null);
              }}
              placeholder="Enter destination..."
              className="w-full bg-natural-bg border border-natural-border rounded-lg px-4 py-2 text-xs outline-none focus:border-natural-primary focus:ring-2 focus:ring-natural-primary/10 transition-all font-medium"
            />
            {endResults.length > 0 && !selectedEnd && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-natural-border rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar overflow-x-hidden">
                {endResults.map((r, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSelectResult(r, false)}
                    className="px-4 py-3 text-[11px] hover:bg-natural-surface cursor-pointer border-b last:border-0 border-natural-border/50 transition-colors flex flex-col justify-center"
                  >
                    <div className="flex items-center gap-2">
                       <Navigation className="w-3 h-3 text-natural-accent shrink-0" />
                       <span className="font-bold text-natural-primary truncate">{r.name}</span>
                    </div>
                    {r.address && <span className="text-[9px] text-natural-muted mt-0.5 truncate pl-5">{r.address}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transport Mode */}
        <div className="flex flex-col">
          <label className="text-[10px] uppercase font-bold text-natural-muted mb-1 ml-1">Asset Mode</label>
          <div className="flex gap-1 bg-natural-bg p-1 rounded-lg border border-natural-border">
            {(['car', 'truck', 'train', 'airplane'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTransport(t)}
                title={t.toUpperCase()}
                className={cn(
                  "p-2 rounded-md transition-all relative group",
                  transport === t ? "bg-white text-natural-primary shadow-sm ring-1 ring-natural-border" : "text-natural-muted hover:text-natural-text"
                )}
              >
                {t === 'car' && <Car className="w-3.5 h-3.5" />}
                {t === 'truck' && <Truck className="w-3.5 h-3.5" />}
                {t === 'train' && <Train className="w-3.5 h-3.5" />}
                {t === 'airplane' && <Plane className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Logic Mode */}
        <div className="hidden lg:flex flex-col">
          <label className="text-[10px] uppercase font-bold text-natural-muted mb-1 ml-1">Logic Priority</label>
          <div className="flex gap-1 bg-natural-bg p-1 rounded-lg border border-natural-border">
            {(['smart', 'fastest', 'shortest'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1 text-[9px] font-bold uppercase rounded transition-all",
                  mode === m ? "bg-white text-natural-primary shadow-sm" : "text-natural-muted hover:text-natural-text"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col">
          <label className="text-[10px] uppercase font-bold text-natural-muted mb-1 opacity-0">Action</label>
          <button 
            onClick={handleCalculate}
            disabled={!selectedStart || !selectedEnd || isLoading}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm transition-all flex items-center gap-2",
              (!selectedStart || !selectedEnd || isLoading) ? "bg-natural-surface text-natural-muted cursor-not-allowed" : "bg-natural-primary text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            )}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
            {isLoading ? "Optimizing..." : "Optimize"}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded border border-red-200 text-red-600 text-[9px] animate-in fade-in zoom-in-95 leading-none">
            <Info className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
