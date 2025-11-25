import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import LeafModel from './LeafModel';
import { SimulationState } from '../types';

interface SimulationCanvasProps {
  simulationState: SimulationState;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ simulationState }) => {
  return (
    <div className="w-full h-full relative bg-space-900">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#0b0d17']} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00f0ff" />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <LeafModel simulationState={simulationState} />
          
          <OrbitControls 
            enablePan={false} 
            minDistance={5} 
            maxDistance={20} 
            autoRotate={simulationState.boundaryLayerThickness > 1.0} // Rotate slowly in space mode
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
      
      {/* Overlay Text for 3D context */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-[0.2em] font-mono pointer-events-none">
        VIEWPORT: LEAF_SURFACE_CAM_01
      </div>
    </div>
  );
};

export default SimulationCanvas;
