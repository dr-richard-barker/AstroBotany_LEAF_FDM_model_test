import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LEAF_VERTEX_SHADER, LEAF_FRAGMENT_SHADER } from '../constants';
import { SimulationState } from '../types';

interface LeafModelProps {
  simulationState: SimulationState;
}

const LeafModel: React.FC<LeafModelProps> = ({ simulationState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Uniforms object
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGravityFactor: { value: 1.0 },
      uBoundaryLayerThickness: { value: 0.0 },
      uAirVelocity: { value: 1.0 },
    }),
    []
  );

  useFrame((state) => {
    // Check if material and specific uniforms exist before accessing properties
    if (materialRef.current && materialRef.current.uniforms) {
      if (materialRef.current.uniforms.uTime) {
        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      }
      
      if (materialRef.current.uniforms.uGravityFactor) {
        // We now use gravityFactor directly from state (controlled by slider)
        // Lerping handles smoothing if the input changes abruptly
        materialRef.current.uniforms.uGravityFactor.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.uGravityFactor.value,
          simulationState.gravityFactor,
          0.1
        );
      }

      // Map physical boundary layer (mm) to visual opacity (0-1)
      // 0.4mm (Earth) -> 0.1 visual
      // 2.0mm (Space) -> 0.8 visual
      const normalizedLayer = Math.min(Math.max((simulationState.boundaryLayerThickness - 0.4) / 2.0, 0), 1);
      const visualLayer = 0.1 + (normalizedLayer * 0.9);

      if (materialRef.current.uniforms.uBoundaryLayerThickness) {
        materialRef.current.uniforms.uBoundaryLayerThickness.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.uBoundaryLayerThickness.value,
          visualLayer,
          0.05
        );
      }

      if (materialRef.current.uniforms.uAirVelocity) {
        materialRef.current.uniforms.uAirVelocity.value = simulationState.airVelocity;
      }
    }
    
    // Subtle floating rotation
    if (meshRef.current) {
        meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 4, 0, 0]} position={[0, 0, 0]}>
      {/* Increased resolution to 128x128 for smoother curling and vertex displacement */}
      <planeGeometry args={[5, 8, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={LEAF_VERTEX_SHADER}
        fragmentShader={LEAF_FRAGMENT_SHADER}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent={true}
      />
    </mesh>
  );
};

export default LeafModel;