
import React from 'react';
import { GravityMode, SimulationState } from '../types';

interface ControlsProps {
  state: SimulationState;
  onUpdate: (updates: Partial<SimulationState>) => void;
}

const LIGHT_COLORS = [
    { name: 'White', value: '#ffffff', spectrum: 0.9 },
    { name: 'Red', value: '#ff0000', spectrum: 1.0 }, // Peak efficiency
    { name: 'Blue', value: '#0000ff', spectrum: 1.0 }, // Peak efficiency
    { name: 'Green', value: '#00ff00', spectrum: 0.4 }, // Low efficiency
    { name: 'Far-Red', value: '#8b0000', spectrum: 0.2 }, // Lowest
];

const Controls: React.FC<ControlsProps> = ({ state, onUpdate }) => {
  
  // Helper to recalculate physics based on inputs
  const calculatePhysics = (
    gravity: number, 
    velocity: number, 
    userThickness: number, 
    co2Lvl: number, 
    o2Lvl: number,
    ambientTemp: number,
    lightInt: number,
    lightCol: string
  ) => {
    // Gravity influences natural convection. 
    const convectionFactor = 0.2 + (gravity * 0.8); 
    
    let thickness = userThickness;

    // Apply Velocity Cooling/Scrubbing
    thickness = thickness / (1.0 + velocity * 0.5);
    const clampedThickness = Math.min(Math.max(thickness, 0.2), 4.0);
    
    // Flux Calculations
    const resistance = clampedThickness * 2.0; 
    const calcCo2Flux = (co2Lvl * 0.2) / Math.max(resistance, 0.5);
    const calcO2Flux = calcCo2Flux * 0.9;

    // Temperature Calculation
    // Base: Ambient
    // Add: Heat Trapping (Boundary Layer)
    // Add: Radiant Heat from Light (Intensity)
    const heatTrapping = clampedThickness * 3.0; 
    const radiantHeat = lightInt * 2.5; // Light increases temp
    const leafTemp = ambientTemp + heatTrapping + radiantHeat;

    // Photosynthetic Efficiency Calculation
    // Factors: CO2 availability, Light Spectrum, Light Intensity, Stress (Temp/Layer)
    const lightInfo = LIGHT_COLORS.find(c => c.value === lightCol) || LIGHT_COLORS[0];
    const spectrumEfficiency = lightInfo.spectrum;
    
    // Intensity Curve (Saturates around 3.0, drops if too high due to photoinhibition simulated simply here)
    let intensityFactor = Math.min(lightInt / 2.0, 1.2); 
    
    // Temperature Penalty (Optimal 20-25C)
    let tempPenalty = 1.0;
    if (leafTemp > 30) tempPenalty = Math.max(0, 1.0 - (leafTemp - 30) * 0.1);
    if (leafTemp < 15) tempPenalty = Math.max(0, 1.0 - (15 - leafTemp) * 0.1);

    // CO2 Penalty
    let co2Penalty = Math.min(calcCo2Flux / 40.0, 1.0); // Normalize against typical flux

    let efficiency = 100 * spectrumEfficiency * intensityFactor * tempPenalty * co2Penalty;
    efficiency = Math.min(Math.max(efficiency, 0), 100);

    // Stress Calculation
    let stress = 10;
    if (clampedThickness > 1.5) stress += 30;
    if (calcCo2Flux < 15) stress += 30;
    if (leafTemp > 30) stress += (leafTemp - 30) * 5;
    if (efficiency < 30) stress += 20;
    stress = Math.min(stress, 100);
    
    return {
      boundaryLayerThickness: clampedThickness,
      co2Flux: calcCo2Flux,
      o2Flux: calcO2Flux,
      stressLevel: stress,
      temperature: leafTemp,
      photosyntheticEfficiency: efficiency
    };
  };

  // Wrapper to call calc with current state + overrides
  const updateState = (overrides: any) => {
      const merged = { ...state, ...overrides };
      const physics = calculatePhysics(
          merged.gravityFactor,
          merged.airVelocity,
          // We pass the *raw* thickness if it wasn't just changed, or the new one if it was.
          // However, our calculatePhysics logic blends userThickness. 
          // For simplicity in this controlled demo, we trust the slider value in state for 'userThickness' reference
          // but we need to know if the slider itself triggered this.
          // Let's rely on the passed overrides having the new 'authoritative' values.
          overrides.boundaryLayerThickness !== undefined ? overrides.boundaryLayerThickness : state.boundaryLayerThickness,
          merged.ambientCO2,
          merged.ambientO2,
          merged.ambientTemperature,
          merged.lightIntensity,
          merged.lightColor
      );
      
      // If we are dragging the thickness slider, we want that value to stick, 
      // otherwise calculatePhysics might modify it based on velocity.
      // To keep the slider responsive as a "target", we return the physics calculated thickness 
      // but if the user *just* moved the slider, we might want to respect that input.
      // For this specific implementation, let's treat the slider as the "Base Thickness" (before velocity)
      // modifying the logic in calculatePhysics slightly to treat input as 'base'.
      // Actually, existing logic: thickness = userThickness / velocityFactor. 
      // This means the slider sets the 'base', and the physics engine sets the 'effective'.
      
      onUpdate({ ...merged, ...physics });
  }

  const handlePreset = (mode: GravityMode) => {
    const isEarth = mode === GravityMode.EARTH_1G;
    const newGravity = isEarth ? 1.0 : 0.0;
    const newThickness = isEarth ? 0.4 : 2.5; 
    
    updateState({
        gravityMode: mode,
        gravityFactor: newGravity,
        boundaryLayerThickness: newThickness
    });
  };

  return (
    <div className="bg-space-800 border border-space-700 p-6 rounded-lg shadow-xl backdrop-blur-sm bg-opacity-90">
      <h3 className="text-sci-cyan font-mono text-sm mb-4 border-b border-space-700 pb-2 uppercase tracking-wider">
        Environmental Control
      </h3>

      {/* Presets */}
      <div className="mb-6">
        <label className="text-gray-400 text-xs font-mono mb-2 block">QUICK SIMULATION PRESETS</label>
        <div className="flex gap-2">
          <button
            onClick={() => handlePreset(GravityMode.EARTH_1G)}
            className={`flex-1 py-2 px-4 rounded font-mono text-sm transition-all duration-300 ${
              state.gravityMode === GravityMode.EARTH_1G
                ? 'bg-sci-green text-space-900 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                : 'bg-space-700 text-gray-400 hover:bg-space-600'
            }`}
          >
            🌍 1G
          </button>
          <button
            onClick={() => handlePreset(GravityMode.MICRO_UG)}
            className={`flex-1 py-2 px-4 rounded font-mono text-sm transition-all duration-300 ${
              state.gravityMode === GravityMode.MICRO_UG
                ? 'bg-sci-cyan text-space-900 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-space-700 text-gray-400 hover:bg-space-600'
            }`}
          >
            🚀 µG
          </button>
        </div>
      </div>

      <div className="space-y-5">
        
        {/* Gravity Factor Slider */}
        <div>
           <div className="flex justify-between mb-1">
             <label className="text-gray-400 text-xs font-mono">GRAVITY FACTOR</label>
             <span className="text-sci-green text-xs font-mono">{state.gravityFactor.toFixed(2)} g</span>
           </div>
           <input
             type="range"
             min="0"
             max="1"
             step="0.01"
             value={state.gravityFactor}
             onChange={(e) => updateState({ gravityFactor: parseFloat(e.target.value) })}
             className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-sci-green"
           />
        </div>

        {/* Boundary Layer Slider */}
        <div>
           <div className="flex justify-between mb-1">
             <label className="text-gray-400 text-xs font-mono">BOUNDARY LAYER THICKNESS</label>
             <span className="text-sci-cyan text-xs font-mono">{state.boundaryLayerThickness.toFixed(2)} mm</span>
           </div>
           <input
             type="range"
             min="0.2"
             max="4.0"
             step="0.1"
             value={state.boundaryLayerThickness}
             onChange={(e) => updateState({ boundaryLayerThickness: parseFloat(e.target.value) })}
             className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-sci-cyan"
           />
        </div>

        {/* Velocity Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-gray-400 text-xs font-mono">FORCED AIR VELOCITY (FDM)</label>
            <span className="text-white text-xs font-mono">{state.airVelocity.toFixed(1)} m/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={state.airVelocity}
            onChange={(e) => updateState({ airVelocity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Grow Light Controls */}
        <div className="pt-2 border-t border-space-700">
           <label className="text-gray-400 text-xs font-mono mb-2 block">GROW LIGHT SPECTRUM</label>
           <div className="flex flex-wrap gap-2 mb-3">
               {LIGHT_COLORS.map((lc) => (
                   <button
                       key={lc.name}
                       onClick={() => updateState({ lightColor: lc.value })}
                       className={`px-2 py-1 text-[10px] font-mono rounded border ${
                           state.lightColor === lc.value 
                           ? 'border-white text-white bg-space-600' 
                           : 'border-space-600 text-gray-500 hover:bg-space-700'
                       }`}
                       style={{ borderColor: state.lightColor === lc.value ? lc.value : undefined }}
                   >
                       {lc.name}
                   </button>
               ))}
           </div>
           <div className="flex justify-between mb-1">
             <label className="text-gray-400 text-xs font-mono">LIGHT INTENSITY</label>
             <span className="text-yellow-200 text-xs font-mono">{state.lightIntensity.toFixed(1)}x</span>
           </div>
           <input
             type="range"
             min="0"
             max="5"
             step="0.1"
             value={state.lightIntensity}
             onChange={(e) => updateState({ lightIntensity: parseFloat(e.target.value) })}
             className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-yellow-200"
           />
           <div className="text-[9px] text-gray-500 font-mono mt-1 text-right">
               High intensity increases Leaf Temp
           </div>
        </div>

        {/* Ambient Temperature Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-gray-400 text-xs font-mono">AMBIENT TEMP</label>
            <span className="text-yellow-400 text-xs font-mono">{state.ambientTemperature.toFixed(1)} °C</span>
          </div>
          <input
            type="range"
            min="15"
            max="35"
            step="0.5"
            value={state.ambientTemperature}
            onChange={(e) => updateState({ ambientTemperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
           />
        </div>

        {/* Gas Levels */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-space-700">
             <div>
                <label className="text-gray-400 text-[10px] font-mono block mb-1">AMBIENT CO2 (ppm)</label>
                <input 
                    type="range" 
                    min="200" max="1500" step="10" 
                    value={state.ambientCO2}
                    onChange={(e) => updateState({ ambientCO2: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-space-700 rounded appearance-none accent-sci-green"
                />
             </div>
             <div>
                <label className="text-gray-400 text-[10px] font-mono block mb-1">AMBIENT O2 (%)</label>
                <input 
                    type="range" 
                    min="15" max="30" step="0.5" 
                    value={state.ambientO2}
                    onChange={(e) => updateState({ ambientO2: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-space-700 rounded appearance-none accent-sci-cyan"
                />
             </div>
        </div>

      </div>
    </div>
  );
};

export default Controls;
