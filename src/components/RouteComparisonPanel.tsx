import React from 'react';
import { Clock, Ruler, ShieldAlert, Zap, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface RouteOption {
  id: string;
  distance: string;
  duration: string;
  riskLevel: "Low" | "Medium" | "High";
  classification: "Optimized" | "Risk" | "Alternative";
  summary: string;
  transportMode: string;
  score: number;
}

interface RouteComparisonPanelProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export const RouteComparisonPanel: React.FC<RouteComparisonPanelProps> = ({ 
  routes, 
  selectedRouteId, 
  onSelect,
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="w-80 bg-white border-l border-natural-border flex flex-col p-6 gap-4 animate-pulse">
        <div className="h-4 bg-natural-surface rounded w-3/4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-natural-bg rounded-xl border border-natural-border" />
          ))}
        </div>
      </div>
    );
  }

  if (routes.length === 0) return null;

  return (
    <div className="w-80 bg-white border-l border-natural-border flex flex-col shadow-sm">
      <div className="p-6 border-b border-natural-border bg-natural-surface/20">
        <h3 className="text-xs font-bold uppercase text-natural-primary tracking-widest flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Deployment Analysis
        </h3>
        <p className="text-[10px] text-natural-muted mt-1 uppercase font-medium">Comparing optimized vectors</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const isOptimized = route.classification === "Optimized";
          const isRisk = route.classification === "Risk";

          return (
            <div
              key={route.id}
              onClick={() => onSelect(route.id)}
              className={cn(
                "group relative p-4 rounded-xl border transition-all cursor-pointer overflow-hidden",
                isSelected 
                  ? "bg-white border-natural-primary ring-1 ring-natural-primary shadow-md" 
                  : "bg-natural-bg border-transparent hover:border-natural-border hover:bg-white"
              )}
            >
              {/* Classification Badge */}
              <div className={cn(
                "absolute top-0 right-0 px-2.5 py-1 text-[8px] font-bold uppercase rounded-bl-lg tracking-tighter",
                isOptimized ? "bg-natural-primary text-white" : 
                isRisk ? "bg-red-500 text-white" : "bg-natural-surface text-natural-muted"
              )}>
                {route.classification}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <h4 className="text-xs font-bold text-natural-primary uppercase truncate pr-16">{route.summary}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] text-natural-muted uppercase font-bold tracking-tight">{route.transportMode} Asset</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-natural-muted" />
                    <span className="text-[10px] font-bold text-natural-text">{route.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3 h-3 text-natural-muted" />
                    <span className="text-[10px] font-bold text-natural-text">{route.distance} km</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <ShieldAlert className={cn(
                      "w-3 h-3",
                      route.riskLevel === "High" ? "text-red-500" : 
                      route.riskLevel === "Medium" ? "text-amber-500" : "text-green-500"
                    )} />
                    <span className={cn(
                      "text-[9px] font-bold uppercase",
                      route.riskLevel === "High" ? "text-red-500" : 
                      route.riskLevel === "Medium" ? "text-amber-600" : "text-green-600"
                    )}>
                      {route.riskLevel} Risk Vulnerability
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="pt-3 border-t border-natural-border flex items-center justify-between">
                    <div className="flex items-center gap-1 text-natural-primary">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase">Efficiency: {Math.max(10, 100 - (route.score / 2)).toFixed(0)}%</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-natural-muted group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
