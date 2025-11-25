export enum GravityMode {
  EARTH_1G = 'EARTH_1G',
  MICRO_UG = 'MICRO_UG',
}

export interface SimulationState {
  gravityMode: GravityMode;
  gravityFactor: number; // 0.0 (uG) to 1.0 (1G)
  airVelocity: number; // m/s
  boundaryLayerThickness: number; // mm
  co2Flux: number; // nmol/cm2/s (Intake)
  o2Flux: number; // nmol/cm2/s (Output)
  temperature: number; // Celsius (Leaf Temperature)
  ambientTemperature: number; // Celsius (Environment)
  stressLevel: number; // 0-100
  ambientCO2: number; // ppm
  ambientO2: number; // %
}

export interface LeafUniforms {
  uTime: { value: number };
  uGravityFactor: { value: number }; // 1.0 = 1G, 0.0 = uG
  uBoundaryLayerThickness: { value: number }; // 0.0 to 1.0 visual scale
  uAirVelocity: { value: number };
}