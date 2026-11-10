import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { PcbComponentThermal, VehicleProfile } from '../types/automotive';
import { Thermometer, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { ThermalProfilingModal } from './ThermalProfilingModal';

interface CircuitThermalHeatmapProps {
  vehicle: VehicleProfile;
  components: PcbComponentThermal[];
}

export const CircuitThermalHeatmap: React.FC<CircuitThermalHeatmapProps> = ({ vehicle, components }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedComp, setSelectedComp] = useState<PcbComponentThermal | null>(null);
  const [inspectedComp, setInspectedComp] = useState<PcbComponentThermal | null>(null);

  useEffect(() => {
    if (!svgRef.current || components.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Board Background
    g.append('rect')
      .attr('width', width - margin.left - margin.right)
      .attr('height', height - margin.top - margin.bottom)
      .attr('rx', 12)
      .attr('fill', '#0B1220')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    // Grid lines for technical look
    const gridG = g.append('g').attr('class', 'grid');
    for (let x = 0; x < width; x += 40) {
      gridG.append('line')
        .attr('x1', x)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', height)
        .attr('stroke', 'rgba(148, 163, 184, 0.05)')
        .attr('stroke-width', 1);
    }
    for (let y = 0; y < height; y += 40) {
      gridG.append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', width)
        .attr('y2', y)
        .attr('stroke', 'rgba(148, 163, 184, 0.05)')
        .attr('stroke-width', 1);
    }

    // Scales
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, width - margin.left - margin.right]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([0, height - margin.top - margin.bottom]);
    
    // Color Scale (Cold Blue -> Hot Orange -> Danger Red)
    const colorScale = d3.scaleSequential()
      .domain([20, 120]) // Temperature range in Celsius
      .interpolator(d3.interpolateRgbBasis(['#38BDF8', '#FACC15', '#FF8A00', '#EF4444']));

    // Components
    const compG = g.selectAll('.component')
      .data(components)
      .enter()
      .append('g')
      .attr('class', 'component cursor-pointer')
      .on('mouseenter', (_event, d) => setSelectedComp(d))
      .on('mouseleave', () => setSelectedComp(null))
      .on('click', (_event, d) => setInspectedComp(d));

    // Component Heat Glow (Radial Gradient)
    const defs = svg.append('defs');
    components.forEach((c) => {
      const grad = defs.append('radialGradient')
        .attr('id', `heat-glow-${c.id}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
      
      grad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colorScale(c.currentTemp))
        .attr('stop-opacity', 0.6);
      
      grad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colorScale(c.currentTemp))
        .attr('stop-opacity', 0);
    });

    // Heat Aura
    compG.append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => Math.max(d.width, d.height) * 2.5)
      .attr('fill', d => `url(#heat-glow-${d.id})`)
      .attr('class', 'animate-pulse');

    // Physical Component Rect
    compG.append('rect')
      .attr('x', d => xScale(d.x - d.width / 2))
      .attr('y', d => yScale(d.y - d.height / 2))
      .attr('width', d => xScale(d.width))
      .attr('height', d => yScale(d.height))
      .attr('rx', 2)
      .attr('fill', '#111C2E')
      .attr('stroke', d => colorScale(d.currentTemp))
      .attr('stroke-width', 2);

    // Label
    compG.append('text')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y - d.height / 2) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text(d => d.designation);

  }, [components]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-workstation-accent" />
            <h3 className="text-lg font-bold text-white">Circuit Thermal Heatmap</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono">
            ECU Internal Component Power Dissipation Analysis (Click any component for thermal report)
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-workstation-bg/50 px-4 py-2 rounded-xl border border-white/5">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-slate-500 uppercase leading-none">Max Node Temp</span>
            <span className="text-sm font-bold text-rose-500 font-mono">
              {Math.max(...components.map(c => c.currentTemp))}°C
            </span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-slate-500 uppercase leading-none">System Load</span>
            <span className="text-sm font-bold text-cyan-400 font-mono">82%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 glass-panel rounded-2xl overflow-hidden relative border-2 border-white/5 shadow-2xl">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/5 text-[9px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              LIVE THERMAL SCAN ACTIVE · CLICK HEATMAP NODE FOR REPORT
            </div>
          </div>
          
          <div className="w-full overflow-x-auto">
            <svg
              ref={svgRef}
              viewBox="0 0 800 500"
              className="w-full min-w-[600px] h-auto"
            />
          </div>

          {/* D3 Hover Tooltip */}
          {selectedComp && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-workstation-accent/30 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold font-mono"
                  style={{ borderColor: selectedComp.currentTemp > selectedComp.maxSafeTemp * 0.8 ? '#EF4444' : '#FF8A00', color: 'white' }}
                >
                  {selectedComp.designation}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedComp.partNumber}</h4>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">{selectedComp.functionRole} (Click to inspect)</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Dissipation</span>
                  <span className="text-xs font-bold text-cyan-400 font-mono">{selectedComp.currentPowerDissipation}W</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Temperature</span>
                  <span className={`text-xs font-bold font-mono ${selectedComp.currentTemp > 75 ? 'text-rose-500' : 'text-amber-400'}`}>
                    {selectedComp.currentTemp}°C
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Margin</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    +{selectedComp.maxSafeTemp - selectedComp.currentTemp}°C
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
              Hot Spot Analysis
            </h4>
            <div className="space-y-3">
              {components
                .sort((a, b) => b.currentTemp - a.currentTemp)
                .slice(0, 3)
                .map((comp) => (
                  <div 
                    key={comp.id} 
                    onClick={() => setInspectedComp(comp)}
                    className="p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-workstation-accent/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white group-hover:text-workstation-accent transition-colors">{comp.designation}</span>
                      <span className={`text-[10px] font-mono font-bold ${comp.currentTemp > 70 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {comp.currentTemp}°C
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${comp.currentTemp > 70 ? 'bg-rose-500' : 'bg-workstation-accent'}`}
                        style={{ width: `${(comp.currentTemp / comp.maxSafeTemp) * 100}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 truncate font-mono">
                      {comp.functionRole}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-status-success">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-tight">Thermal Guard Active</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                Real-time thermal throttling monitoring. No critical thermal breaches detected on the {components.length} analyzed nodes.
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500 uppercase">Board Ambient</span>
                <span className="text-slate-300">42.4°C</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500 uppercase">Case Delta</span>
                <span className="text-slate-300">+8.2°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Profiling Report Modal */}
      {inspectedComp && (
        <ThermalProfilingModal
          component={inspectedComp}
          vehicle={vehicle}
          onClose={() => setInspectedComp(null)}
        />
      )}
    </div>
  );
};

