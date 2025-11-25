import React from 'react';
import { SimulationState } from '../types';
import FluxChart from './FluxChart';

interface TelemetryPanelProps {
  state: SimulationState;
}

const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ state }) => {
  const data = [
    { name: 'Boundary Layer', value: state.boundaryLayerThickness, max: 4, unit: 'mm', color: '#00f0ff' },
    { name: 'Leaf Temp', value: state.temperature, max: 40, unit: '°C', color: state.temperature > 30 ? '#ff4d4d' : '#fbbf24' },
    { name: 'Ambient Temp', value: state.ambientTemperature, max: 40, unit: '°C', color: '#9ca3af' },
  ];

  return (
    <div className="bg-space-800 border border-space-700 p-6 rounded-lg shadow-xl backdrop-blur-sm bg-opacity-90 h-full flex flex-col">
      <h3 className="text-sci-cyan font-mono text-sm mb-6 border-b border-space-700 pb-2 uppercase tracking-wider flex justify-between items-center">
        <span>Leaf Telemetry</span>
        <span className={`w-2 h-2 rounded-full animate-pulse ${state.stressLevel > 50 ? 'bg-sci-alert' : 'bg-sci-green'}`}></span>
      </h3>

      {/* Primary Metrics Bars */}
      <div className="space-y-4 mb-4">
        {data.map((item) => (
          <div key={item.name} className="relative">
             <div className="flex justify-between text-xs font-mono mb-1 text-gray-400 uppercase">
              <span>{item.name}</span>
              <span style={{ color: item.color }}>{item.value.toFixed(1)} {item.unit}</span>
             </div>
             <div className="w-full bg-space-900 rounded-full h-2 overflow-hidden border border-space-700">
               <div 
                  className="h-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                    backgroundColor: item.color,
                    boxShadow: `0 0 10px ${item.color}`
                  }}
               />
             </div>
             {item.name === 'Leaf Temp' && state.temperature > state.ambientTemperature + 2 && (
                 <div className="text-[9px] text-yellow-500 mt-0.5 font-mono">
                     +{(state.temperature - state.ambientTemperature).toFixed(1)}°C Heat Trap Effect
                 </div>
             )}
             {item.name === 'Boundary Layer' && state.gravityFactor < 0.2 && state.boundaryLayerThickness > 1.5 && (
                <div className="text-[9px] text-sci-alert mt-1 font-mono italic animate-pulse">
                   ⚠️ Diffusional resistance CRITICAL
                </div>
             )}
          </div>
        ))}
      </div>
      
      {/* Flux Chart Component */}
      <div className="flex-grow border-t border-space-700 pt-4">
        <FluxChart state={state} />
      </div>

      <div className="mt-4 p-3 bg-space-900 rounded border border-space-700 font-mono text-xs text-gray-400">
        <p className="mb-1 text-sci-cyan">STATUS REPORT:</p>
        <p className={state.stressLevel > 50 ? "text-sci-alert" : "text-gray-300"}>
          {state.stressLevel > 50 
            ? "CRITICAL: HYPOXIA IMMINENT. Thick boundary layer inhibiting gas exchange."
            : "NOMINAL: Photosynthetic rates stable. Adequate diffusion."}
        </p>
      </div>
    </div>
  );
};

export default TelemetryPanel;