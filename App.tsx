import React, { useState } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import TelemetryPanel from './components/TelemetryPanel';
import { SimulationState } from './types';
import { INITIAL_STATE } from './constants';

const App: React.FC = () => {
  const [simState, setSimState] = useState<SimulationState>(INITIAL_STATE);

  const handleStateUpdate = (updates: Partial<SimulationState>) => {
    setSimState(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="relative w-screen h-screen bg-space-900 text-white overflow-hidden flex flex-col md:flex-row">
      
      {/* 3D Visualization Area */}
      <div className="flex-grow h-[60vh] md:h-full relative order-2 md:order-1">
        <SimulationCanvas simulationState={simState} />
        
        {/* Overlay Title */}
        <div className="absolute top-6 left-6 pointer-events-none z-10">
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <span className="text-sci-green">🌿</span> AstroBotany <span className="text-sci-cyan opacity-50">FDM</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            FLUID DYNAMICS MODELING // {simState.gravityMode}
          </p>
        </div>
      </div>

      {/* Sidebar Interface */}
      <div className="w-full md:w-[400px] h-auto md:h-full bg-space-900/80 backdrop-blur-md border-l border-space-700 flex flex-col p-4 gap-4 z-20 order-1 md:order-2 overflow-y-auto">
        <Controls state={simState} onUpdate={handleStateUpdate} />
        <TelemetryPanel state={simState} />
        
        <div className="mt-auto text-center text-[10px] text-gray-600 font-mono py-2">
          Purdue AstroBotany Lab // Simulation Build v2.5.0
        </div>
      </div>
    </div>
  );
};

export default App;