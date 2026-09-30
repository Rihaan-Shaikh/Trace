import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Generate a premium organic sphere of particles
function generatePremiumParticles(count: number, radius: number) {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Math to distribute points in a fuzzy sphere
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = radius * (0.8 + Math.random() * 0.4); // slightly fuzzy edge
    
    points[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    points[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    points[i * 3 + 2] = r * Math.cos(phi);
  }
  return points;
}

function PremiumDataCore({ dangerLevel }: { dangerLevel: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const bgPointsRef = useRef<THREE.Points>(null!);
  
  // Core dense data cluster
  const corePoints = useMemo(() => generatePremiumParticles(3000, 1.8), []);
  // Sparse background ambient data
  const ambientPoints = useMemo(() => generatePremiumParticles(1000, 4), []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    if (pointsRef.current) {
      // Elegant, fluid rotation
      pointsRef.current.rotation.y += delta * 0.05;
      pointsRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
      
      // Organic breathing effect
      const breathe = 1 + Math.sin(time * 1.5) * 0.03;
      pointsRef.current.scale.set(breathe, breathe, breathe);
    }
    
    if (bgPointsRef.current) {
      bgPointsRef.current.rotation.y -= delta * 0.02;
      bgPointsRef.current.rotation.z += delta * 0.01;
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* Ambient background dust */}
      <Points ref={bgPointsRef} positions={ambientPoints} stride={3} frustumCulled={false}>
        <PointMaterial 
          transparent 
          color="#333333" 
          size={0.02} 
          sizeAttenuation={true} 
          depthWrite={false} 
        />
      </Points>

      {/* Primary Data Core */}
      <Points ref={pointsRef} positions={corePoints} stride={3} frustumCulled={false}>
        <PointMaterial 
          transparent 
          color="#FA5A37" 
          size={0.015} 
          sizeAttenuation={true} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
          opacity={0.8}
        />
      </Points>
      
      {/* Glowing inner core to make it look expensive and alive */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#FA5A37" transparent opacity={0.05} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export function RiskVisualizer({ currentPct, lapsePct }: { currentPct: number, lapsePct: number }) {
  const dangerLevel = Math.min(1, currentPct / lapsePct);
  
  return (
    <div className="w-full h-full bg-[#0A0A0C] relative overflow-hidden">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <PremiumDataCore dangerLevel={dangerLevel} />
      </Canvas>
    </div>
  );
}
