import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Generate random points in a sphere
function generatePoints(count: number, radius: number) {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.cbrt(Math.random()) * radius;
    const sinPhi = Math.sin(phi);
    points[i * 3] = r * sinPhi * Math.cos(theta);
    points[i * 3 + 1] = r * sinPhi * Math.sin(theta);
    points[i * 3 + 2] = r * Math.cos(phi);
  }
  return points;
}

export function RiskVisualizer({ currentPct, lapsePct }: { currentPct: number, lapsePct: number }) {
  const isLapsed = currentPct >= lapsePct;
  const dangerLevel = Math.min(1, currentPct / lapsePct);

  return (
    <div className="w-full h-full bg-[#0A0A0C] relative overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <DataNetwork dangerLevel={dangerLevel} isLapsed={isLapsed} />
      </Canvas>
    </div>
  );
}

function DataNetwork({ dangerLevel, isLapsed }: { dangerLevel: number, isLapsed: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const boxRef = useRef<THREE.Mesh>(null!);
  const [shattered, setShattered] = useState(false);
  
  // Data node constellation
  const pointsData = useMemo(() => generatePoints(1000, 1.5), []);
  
  useEffect(() => {
    if (isLapsed && !shattered) setShattered(true);
    else if (!isLapsed && shattered) setShattered(false);
  }, [isLapsed, shattered]);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      // Rotate the data cluster
      pointsRef.current.rotation.y += delta * (0.1 + dangerLevel * 0.4);
      pointsRef.current.rotation.x += delta * (0.05 + dangerLevel * 0.2);
      
      // Pulse effect based on danger level
      const scale = 1 + Math.sin(state.clock.elapsedTime * (2 + dangerLevel * 5)) * 0.05 * dangerLevel;
      pointsRef.current.scale.set(scale, scale, scale);
    }
    
    if (boxRef.current && !shattered) {
      boxRef.current.rotation.x += delta * 0.1;
      boxRef.current.rotation.y += delta * 0.15;
      
      // The box swells right before breaking
      const boxScale = 1 + (dangerLevel > 0.8 ? (dangerLevel - 0.8) * 1.5 : 0);
      boxRef.current.scale.set(boxScale, boxScale, boxScale);
    }
  });

  const safeColor = new THREE.Color('#F5F5F3');
  const dangerColor = new THREE.Color('#FA5A37');
  const currentColor = safeColor.clone().lerp(dangerColor, dangerLevel);

  return (
    <group>
      {/* Data Constellation */}
      <Points ref={pointsRef} positions={pointsData} stride={3} frustumCulled={false}>
        <PointMaterial 
          transparent 
          color={currentColor} 
          size={0.03} 
          sizeAttenuation={true} 
          depthWrite={false} 
        />
      </Points>

      {/* The wireframe boundary (Coverage) */}
      {!shattered && (
        <mesh ref={boxRef}>
          <boxGeometry args={[3.2, 3.2, 3.2]} />
          <meshBasicMaterial color={dangerLevel > 0.9 ? "#FA5A37" : "#525252"} wireframe wireframeLinewidth={dangerLevel > 0.9 ? 2 : 1} transparent opacity={0.3} />
        </mesh>
      )}

      {/* Explosion effect if shattered */}
      {shattered && (
        <Points positions={pointsData} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#FA5A37" size={0.05} sizeAttenuation={true} depthWrite={false} />
          {/* An exploding animation could be added here in useFrame */}
        </Points>
      )}
    </group>
  );
}
