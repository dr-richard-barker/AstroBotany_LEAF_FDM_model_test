import { SimulationState, GravityMode } from './types';

// Vertex Shader: Handles the Leaf Morphology (Step 1)
// Morphs between flat (1G) and curled/narrow (uG) based on uGravityFactor
export const LEAF_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  uniform float uTime;
  uniform float uGravityFactor; // 1.0 = Flat (1G), 0.0 = Curled (uG)

  // Pseudo-random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // Simple noise for organic surface irregularity
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // -- MORPHOLOGY LOGIC (Step 1) --
    // Based on Arabidopsis adaptation diagrams
    
    // Normalized distance from center vein (x-axis assumed as width)
    float xDist = pos.x; 
    
    // 1. Narrowing Effect in uG
    // In uG (factor 0), leaf becomes significantly narrower (lanceolate).
    // In 1G (factor 1), leaf is wider (obovate).
    float narrowing = mix(0.5, 1.0, uGravityFactor); 
    pos.x *= narrowing;

    // 2. Curling Effect (Hyponasty)
    // In uG, leaf curls upwards/inwards like a boat/taco. 
    float curlStrength = 4.5 * (1.0 - uGravityFactor); // Stronger curl in uG
    
    // Apply curl: z increases quadratically as we move away from center x
    // This creates the "folded" look seen in the hypoxia diagrams
    float curl = pow(abs(pos.x * 0.6), 2.0) * curlStrength;
    
    // Add subtle organic movement (breathing)
    float breath = sin(uTime * 0.5) * 0.05 * (1.0 - uGravityFactor);
    
    pos.z += curl + breath;

    // Add surface noise for realism (Vertex displacement)
    float surfaceNoise = noise(uv * 5.0) * 0.1;
    pos.z += surfaceNoise;

    // Recalculate normal after displacement for correct lighting
    // (Approximation by rotating original normal based on curl derivative)
    vec3 objectNormal = normal;
    float slope = 2.0 * (pos.x * 0.6) * 0.6 * curlStrength * sign(pos.x);
    vec3 tangent = normalize(vec3(1.0, 0.0, slope));
    vec3 bitangent = vec3(0.0, 1.0, 0.0);
    objectNormal = normalize(cross(tangent, bitangent));

    vNormal = normalize(normalMatrix * objectNormal);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader: Handles Realism & Boundary Layer (Step 2 & 3)
export const LEAF_FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uBoundaryLayerThickness; // Visual intensity 0.0 - 1.0
  uniform float uAirVelocity; // Controls turbulence speed

  // --- NOISE FUNCTIONS ---

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // --- ARABIDOPSIS SPECIFIC GENERATORS ---

  float getVeins(vec2 uv) {
      float xDist = abs(uv.x - 0.5);
      float midrib = 1.0 - smoothstep(0.0, 0.02 + uv.y * 0.01, xDist); 
      vec2 veinUV = uv;
      veinUV.y -= pow(abs(uv.x - 0.5), 1.5) * 1.5; 
      float secVeins = sin(veinUV.y * 30.0); 
      secVeins = smoothstep(0.9, 0.95, secVeins); 
      float veinMask = smoothstep(0.05, 0.1, xDist) * (1.0 - smoothstep(0.4, 0.5, xDist));
      secVeins *= veinMask;
      float net = snoise(uv * 40.0);
      net = smoothstep(0.2, 0.3, net);
      return clamp(midrib + secVeins * 0.5 + net * 0.1, 0.0, 1.0);
  }

  float getTrichomes(vec2 uv) {
      float t = snoise(uv * 120.0); 
      t = smoothstep(0.75, 1.0, t);
      return t;
  }

  float getMicroTexture(vec2 uv) {
      float cells = snoise(uv * 60.0);
      return cells;
  }

  float getLeafHeight(vec2 uv) {
      float veins = getVeins(uv);
      float trichomes = getTrichomes(uv);
      float micro = getMicroTexture(uv);
      float height = 0.5;
      height -= veins * 0.15; 
      height += trichomes * 0.4; 
      height += micro * 0.05; 
      return height;
  }

  void main() {
    // --- 0. SHAPE MASKING ---
    float lx = (vUv.x - 0.5) * 2.0; 
    float ly = vUv.y;
    float stemWidth = 0.06;
    float bladeCurve = sin((ly - 0.1) * 3.4); 
    bladeCurve = smoothstep(0.0, 1.0, bladeCurve); 
    float bladeWidth = pow(bladeCurve, 0.4) * 0.95; 
    float widthProfile = mix(stemWidth, bladeWidth, smoothstep(0.1, 0.25, ly));
    float marginNoise = snoise(vec2(ly * 20.0, 0.0)) * 0.03;
    widthProfile += marginNoise;
    widthProfile *= smoothstep(1.02, 0.95, ly);

    if (abs(lx) > widthProfile) {
        discard;
    }

    // --- 1. NORMAL MAPPING ---
    float epsilon = 0.002;
    float hCenter = getLeafHeight(vUv);
    float hRight  = getLeafHeight(vUv + vec2(epsilon, 0.0));
    float hTop    = getLeafHeight(vUv + vec2(0.0, epsilon));
    
    vec3 dx = vec3(epsilon, 0.0, (hRight - hCenter) * 0.8);
    vec3 dy = vec3(0.0, epsilon, (hTop - hCenter) * 0.8);
    vec3 bumpedNormal = normalize(cross(dx, dy));
    vec3 normal = normalize(vNormal + bumpedNormal * 0.4); 

    // --- 2. COLOR & TEXTURE ---
    vec3 cLeafDark = vec3(0.15, 0.35, 0.10); 
    vec3 cLeafLight = vec3(0.35, 0.55, 0.25); 
    vec3 cVein = vec3(0.45, 0.60, 0.35); 
    vec3 cTrichome = vec3(0.9, 0.95, 0.9); 
    
    float veinMask = getVeins(vUv);
    float trichomeMask = getTrichomes(vUv);
    float microMask = getMicroTexture(vUv);

    vec3 albedo = mix(cLeafDark, cLeafLight, microMask * 0.5 + ly * 0.3);
    albedo = mix(albedo, cVein, veinMask * 0.6);
    albedo = mix(albedo, cTrichome, trichomeMask * 0.8);

    if (ly < 0.15) {
        albedo = mix(vec3(0.5, 0.6, 0.3), albedo, smoothstep(0.0, 0.15, ly));
    }

    // --- 3. LIGHTING ---
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightPos = vec3(5.0, 8.0, 10.0);
    vec3 lightDir = normalize(lightPos);
    
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(dot(normal, halfDir), 0.0);
    float specWax = pow(specAngle, 16.0) * 0.2;
    float specTrichome = pow(specAngle, 64.0) * trichomeMask * 1.5;
    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    rim = pow(rim, 3.0);

    vec3 lighting = albedo * (diff + 0.2) + vec3(1.0) * (specWax + specTrichome);
    lighting += vec3(0.5, 0.7, 0.5) * rim * 0.4;

    // --- 4. BOUNDARY LAYER & FDM VISUALIZATION ---
    
    // We visually represent the boundary layer as a turbulent gas
    // High velocity = fast flowing streaks (thin layer)
    // Low velocity = slow, stagnant cloud (thick layer)
    
    // FDM Streamline Simulation
    float flowSpeed = uAirVelocity * 2.0 + 0.2;
    
    // Base Flow Noise (moving along Y axis)
    vec2 flowUV = vUv * vec2(4.0, 12.0); // Streaky aspect ratio
    flowUV.y -= uTime * flowSpeed; 
    
    // Distort flow with some turbulence
    float turbulence = snoise(vUv * 4.0 + uTime * 0.5);
    flowUV.x += turbulence * 0.5;

    // Generate stream patterns
    float flowPattern = snoise(flowUV);
    
    // Stagnation Pattern (for low velocity/thick layer)
    float stagnantPattern = snoise(vUv * 6.0 - uTime * 0.1);
    
    // Mix patterns based on velocity
    // If velocity is high, we see more flow streaks. If low, we see stagnant blobs.
    float velocityMix = smoothstep(0.0, 2.0, uAirVelocity);
    float gasPattern = mix(stagnantPattern, flowPattern, velocityMix);
    
    // Boundary Layer Opacity/Glow
    // uBoundaryLayerThickness (0-1) drives the density
    
    float layerDensity = smoothstep(0.0, 1.0, uBoundaryLayerThickness);
    
    // Fresnel effect for gas: clearer when looking straight on, opaque at angles (accumulating thickness)
    float gasFresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0); // Uses vNormal (smooth) not bumped
    
    // Visualize Gas
    // Color: Cyan for O2/CO2 flux
    vec3 gasColor = vec3(0.2, 0.8, 1.0);
    
    // Gas Visibility Mask
    // Pattern creates gaps, Fresnel adds volume, Density scales overall intensity
    float gasAlpha = (0.3 + 0.7 * gasPattern) * (gasFresnel + 0.2) * layerDensity;
    
    // Clamp
    gasAlpha = clamp(gasAlpha, 0.0, 0.8);
    
    // Composite Gas over Leaf
    vec3 finalColor = mix(lighting, gasColor, gasAlpha * 0.6); 

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const INITIAL_STATE: SimulationState = {
  gravityMode: GravityMode.EARTH_1G,
  gravityFactor: 1.0,
  airVelocity: 1.0,
  boundaryLayerThickness: 0.4,
  co2Flux: 50,
  o2Flux: 45,
  temperature: 22,
  ambientTemperature: 22,
  stressLevel: 0,
  ambientCO2: 400,
  ambientO2: 21
};