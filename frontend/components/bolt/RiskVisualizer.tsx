import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';

// Points for T, R, A, C, E (in a 2D plane, z=0, scaled and positioned)
// Each letter is a series of strokes (arrays of Vector3)
const LETTERS = [
  // T
  [
    [new THREE.Vector3(-2.5, 1, 0), new THREE.Vector3(-1.5, 1, 0)], // horizontal
    [new THREE.Vector3(-2, 1, 0), new THREE.Vector3(-2, -1, 0)],    // vertical
  ],
  // R
  [
    [new THREE.Vector3(-1, -1, 0), new THREE.Vector3(-1, 1, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1, 0, 0)], // loop
    [new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0, -1, 0)], // leg
  ],
  // A
  [
    [new THREE.Vector3(0.5, -1, 0), new THREE.Vector3(1, 1, 0), new THREE.Vector3(1.5, -1, 0)], // tent
    [new THREE.Vector3(0.75, 0, 0), new THREE.Vector3(1.25, 0, 0)], // bridge
  ],
  // C
  [
    [new THREE.Vector3(3, 1, 0), new THREE.Vector3(2, 1, 0), new THREE.Vector3(2, -1, 0), new THREE.Vector3(3, -1, 0)], // arc
  ],
  // E
  [
    [new THREE.Vector3(4.5, 1, 0), new THREE.Vector3(3.5, 1, 0), new THREE.Vector3(3.5, -1, 0), new THREE.Vector3(4.5, -1, 0)], // C shape
    [new THREE.Vector3(3.5, 0, 0), new THREE.Vector3(4.2, 0, 0)], // middle bar
  ]
];

// Flatten all points for the constellation
const ALL_LETTER_POINTS = LETTERS.flat(2);

function generateBackgroundPoints(count: number, radius: number) {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    points[i * 3] = (Math.random() - 0.5) * radius;
    points[i * 3 + 1] = (Math.random() - 0.5) * radius;
    points[i * 3 + 2] = (Math.random() - 0.5) * radius;
  }
  return points;
}

function TraceNetwork({ dangerLevel }: { dangerLevel: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const bgPoints = useMemo(() => generateBackgroundPoints(200, 10), []);

  const allStrokes = LETTERS.flat();
  const totalStrokes = allStrokes.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStrokeIndex(prev => (prev + 1) % (totalStrokes + 5)); // +5 for pause at the end
    }, 400); // 400ms per stroke
    return () => clearInterval(interval);
  }, [totalStrokes]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Very slow cinematic rotation
      groupRef.current.rotation.y += delta * 0.1;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  const visibleStrokes = allStrokes.slice(0, Math.min(currentStrokeIndex, totalStrokes));

  return (
    <group ref={groupRef} position={[-1, 0, 0]} scale={[0.8, 0.8, 0.8]}>
      
      {/* Background static constellation */}
      <Points positions={bgPoints} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#404040" size={0.05} sizeAttenuation={true} depthWrite={false} />
      </Points>

      {/* Nodes forming the letters */}
      {ALL_LETTER_POINTS.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#FA5A37" />
        </mesh>
      ))}

      {/* Connecting Lines being drawn sequentially */}
      {visibleStrokes.map((stroke, i) => (
        <Line 
          key={i}
          points={stroke}
          color="#FA5A37"
          lineWidth={2}
          transparent
          opacity={0.8}
        />
      ))}
    </group>
  );
}

export function RiskVisualizer({ currentPct, lapsePct }: { currentPct: number, lapsePct: number }) {
  const dangerLevel = Math.min(1, currentPct / lapsePct);
  
  return (
    <div className="w-full h-full bg-[#0A0A0C] relative overflow-hidden">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <TraceNetwork dangerLevel={dangerLevel} />
      </Canvas>
    </div>
  );
}
