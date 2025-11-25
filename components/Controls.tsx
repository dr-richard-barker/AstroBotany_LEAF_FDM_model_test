import React from 'react';
import { GravityMode, SimulationState } from '../types';

interface ControlsProps {
  state: SimulationState;
  onUpdate: (updates: Partial<SimulationState>) => void;
}

const Controls: React.FC<ControlsProps> = ({ state, onUpdate }) => {
  
  // Helper to recalculate physics based on inputs
  const calculatePhysics = (
    gravity: number, 
    velocity: number, 
    userThickness: number, 
    co2Lvl: number, 
    o2Lvl: number,
    ambientTemp: number
  ) => {
    // Gravity influences natural convection. 
    // High gravity (1.0) = good convection = thinner layer.
    // Low gravity (0.0) = no convection = thicker layer.
    
    // We blend the calculated thickness with the user manual override for simulation purposes
    const convectionFactor = 0.2 + (gravity * 0.8); // 1.0 at 1G, 0.2 at 0G
    
    // Physical thickness calculation attempt (overridden by user slider for educational control)
    let thickness = userThickness;

    // Apply Velocity Cooling/Scrubbing
    // High velocity reduces thickness and improves convection
    thickness = thickness / (1.0 + velocity * 0.5);
    const clampedThickness = Math.min(Math.max(thickness, 0.2), 4.0);
    
    // Flux Calculations
    // Thicker layer = Higher resistance = Lower Flux
    const resistance = clampedThickness * 2.0; 
    
    // CO2 Flux = (Ambient - Internal) / Resistance
    const calcCo2Flux = (co2Lvl * 0.2) / Math.max(resistance, 0.5);
    
    // O2 Flux (Output) depends on CO2 intake (Photosynthesis)
    const calcO2Flux = calcCo2Flux * 0.9;

    // Temperature: 
    // Ambient Temp + Heat Trapping Effect of Boundary Layer
    // Thicker layer prevents evaporative cooling -> higher leaf temp.
    const heatTrapping = clampedThickness * 3.0; // +3 degrees per mm approx
    const leafTemp = ambientTemp + heatTrapping;

    // Stress: High Leaf Temp or thick layer or low CO2
    let stress = 10;
    if (clampedThickness > 1.5) stress += 30;
    if (calcCo2Flux < 15) stress += 30;
    if (leafTemp > 30) stress += (leafTemp - 30) * 5;
    stress = Math.min(stress, 100);
    
    return {
      boundaryLayerThickness: clampedThickness,
      co2Flux: calcCo2Flux,
      o2Flux: calcO2Flux,
      stressLevel: stress,
      temperature: leafTemp
    };
  };

  const handlePreset = (mode: GravityMode) => {
    const isEarth = mode === GravityMode.EARTH_1G;
    const newGravity = isEarth ? 1.0 : 0.0;
    const newThickness = isEarth ? 0.4 : 2.5; // Base thickness before velocity
    const velocity = state.airVelocity;
    
    const physics = calculatePhysics(
        newGravity, 
        velocity, 
        newThickness, 
        state.ambientCO2, 
        state.ambientO2,
        state.ambientTemperature
    );

    onUpdate({
      gravityMode: mode,
      gravityFactor: newGravity,
      ...physics
    });
  };

  const handleGravitySlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const physics = calculatePhysics(
        val, 
        state.airVelocity, 
        state.boundaryLayerThickness * (1 + (1-val)), 
        state.ambientCO2, 
        state.ambientO2,
        state.ambientTemperature
    );
    onUpdate({
        gravityFactor: val,
        gravityMode: val > 0.5 ? GravityMode.EARTH_1G : GravityMode.MICRO_UG,
        ...physics
    });
  };

  const handleVelocityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const velocity = parseFloat(e.target.value);
    const physics = calculatePhysics(
        state.gravityFactor, 
        velocity, 
        state.boundaryLayerThickness, 
        state.ambientCO2, 
        state.ambientO2,
        state.ambientTemperature
    );
    onUpdate({
      airVelocity: velocity,
      ...physics
    });
  };
  
  const handleThicknessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const val = parseFloat(e.target.value);
     const physics = calculatePhysics(
         state.gravityFactor, 
         state.airVelocity, 
         val, 
         state.ambientCO2, 
         state.ambientO2,
         state.ambientTemperature
     );
     // Force override thickness to slider value
     onUpdate({
         ...physics,
         boundaryLayerThickness: val, 
     });
  };

  const handleGasChange = (type: 'co2' | 'o2', e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      const newCo2 = type === 'co2' ? val : state.ambientCO2;
      const newO2 = type === 'o2' ? val : state.ambientO2;
      
      const physics = calculatePhysics(
          state.gravityFactor, 
          state.airVelocity, 
          state.boundaryLayerThickness, 
          newCo2, 
          newO2,
          state.ambientTemperature
      );
      onUpdate({
          ambientCO2: newCo2,
          ambientO2: newO2,
          ...physics
      });
  }

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      const physics = calculatePhysics(
          state.gravityFactor, 
          state.airVelocity, 
          state.boundaryLayerThickness, 
          state.ambientCO2, 
          state.ambientO2,
          val // new ambient temp
      );
      onUpdate({
          ambientTemperature: val,
          ...physics
      });
  }

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
             onChange={handleGravitySlide}
             className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-sci-green"
           />
           <div className="flex justify-between mt-1 text-[9px] text-gray-600 font-mono">
             <span>MICRO (Curled)</span>
             <span>EARTH (Flat)</span>
           </div>
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
             onChange={handleThicknessChange}
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
            onChange={handleVelocityChange}
            className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-white"
          />
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
            onChange={handleTempChange}
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
                    onChange={(e) => handleGasChange('co2', e)}
                    className="w-full h-1 bg-space-700 rounded appearance-none accent-sci-green"
                />
                <div className="text-right text-sci-green text-xs font-mono mt-1">{state.ambientCO2}</div>
             </div>
             <div>
                <label className="text-gray-400 text-[10px] font-mono block mb-1">AMBIENT O2 (%)</label>
                <input 
                    type="range" 
                    min="15" max="30" step="0.5" 
                    value={state.ambientO2}
                    onChange={(e) => handleGasChange('o2', e)}
                    className="w-full h-1 bg-space-700 rounded appearance-none accent-sci-cyan"
                />
                <div className="text-right text-sci-cyan text-xs font-mono mt-1">{state.ambientO2}%</div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default Controls;