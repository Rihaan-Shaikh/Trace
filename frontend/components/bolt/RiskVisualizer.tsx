import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Edges } from '@react-three/drei';
import * as THREE from 'three';

interface RiskVisualizerProps {
  currentPct: number;
  lapsePct: number;
}

export function RiskVisualizer({ currentPct, lapsePct }: RiskVisualizerProps) {
  const isLapsed = currentPct >= lapsePct;
  const dangerLevel = Math.min(1, currentPct / lapsePct);

  return (
    <div className="w-full h-full bg-[#0A0A0C] relative overflow-hidden">
      

      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, -10, -10]} intensity={0.2} color="#FA5A37" />
        
        <RiskScene dangerLevel={dangerLevel} isLapsed={isLapsed} />
      </Canvas>
      
      {isLapsed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-[#0A0A0C]/50 backdrop-blur-[2px] transition-all duration-500">
          <div className="text-vermilion-500 font-mono text-xl tracking-[0.3em] uppercase font-bold text-center animate-fade-in px-8 py-4 border border-vermilion-500/50 bg-[#0A0A0C]/90 shadow-[0_0_50px_rgba(250,90,55,0.2)]">
            COVERAGE LAPSED
          </div>
        </div>
      )}
    </div>
  );
}

function RiskScene({ dangerLevel, isLapsed }: { dangerLevel: number, isLapsed: boolean }) {
  const blobRef = useRef<THREE.Mesh>(null!);
  const boxRef = useRef<THREE.Mesh>(null!);
  const [shattered, setShattered] = useState(false);
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    if (isLapsed && !shattered) {
      setShattered(true);
      // Explode the box into particles
      const p = [];
      for(let i=0; i<60; i++) {
        p.push({
          pos: new THREE.Vector3((Math.random()-0.5)*2.5, (Math.random()-0.5)*2.5, (Math.random()-0.5)*2.5),
          vel: new THREE.Vector3((Math.random()-0.5)*15, (Math.random()-0.5)*15, (Math.random()-0.5)*15),
          rot: new THREE.Vector3(Math.random(), Math.random(), Math.random())
        });
      }
      setParticles(p);
    } else if (!isLapsed && shattered) {
      setShattered(false);
    }
  }, [isLapsed, shattered]);

  useFrame((state, delta) => {
    if (blobRef.current) {
      blobRef.current.rotation.x += delta * (0.2 + dangerLevel * 0.5);
      blobRef.current.rotation.y += delta * (0.3 + dangerLevel * 0.5);
      
      const targetScale = 1 + (dangerLevel * 0.6); // swells to 1.6x size
      blobRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }

    if (boxRef.current && !shattered) {
      boxRef.current.rotation.x += delta * 0.1;
      boxRef.current.rotation.y += delta * 0.15;
    }
  });

  const safeColor = new THREE.Color('#F5F5F3');
  const dangerColor = new THREE.Color('#FA5A37');
  const currentColor = safeColor.clone().lerp(dangerColor, dangerLevel);

  return (
    <group>
      {/* The organic risk blob */}
      <mesh ref={blobRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial 
          color={currentColor}
          envMapIntensity={1} 
          clearcoat={1} 
          clearcoatRoughness={0} 
          metalness={0.8}
          roughness={0.2}
          distort={0.2 + (dangerLevel * 0.7)} // Spikes aggressively when near threshold
          speed={2 + (dangerLevel * 6)}       // Pulses faster when near threshold
        />
      </mesh>

      {/* The wireframe coverage box */}
      {!shattered && (
        <mesh ref={boxRef}>
          <boxGeometry args={[3, 3, 3]} />
          <meshBasicMaterial visible={false} />
          <Edges 
            linewidth={dangerLevel > 0.9 ? 3 : 1} 
            threshold={15} 
            color={dangerLevel > 0.9 ? "#FA5A37" : "#A3A3A0"} 
          />
        </mesh>
      )}

      {/* Shatter particles */}
      {shattered && (
        <ShatterParticles particles={particles} />
      )}
    </group>
  );
}

function ShatterParticles({ particles }: { particles: any[] }) {
  const groupRef = useRef<THREE.Group>(null!);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const p = particles[i];
        if (p) {
          child.position.addScaledVector(p.vel, delta);
          child.rotation.x += p.rot.x * delta * 5;
          child.rotation.y += p.rot.y * delta * 5;
          // Apply some gravity and drag
          p.vel.y -= delta * 5;
          p.vel.multiplyScalar(0.92); // drag
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos.clone()}>
          <boxGeometry args={[0.05, 0.05, 0.5]} />
          <meshBasicMaterial color="#FA5A37" />
        </mesh>
      ))}
    </group>
  );
}
