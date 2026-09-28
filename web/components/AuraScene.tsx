"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Heart() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.3);
    shape.bezierCurveTo(-0.15, -0.15, -0.76, 0.14, -0.53, 0.49);
    shape.bezierCurveTo(-0.34, 0.77, -0.04, 0.53, 0, 0.38);
    shape.bezierCurveTo(0.04, 0.53, 0.34, 0.77, 0.53, 0.49);
    shape.bezierCurveTo(0.76, 0.14, 0.15, -0.15, 0, -0.3);
    const result = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.05, bevelThickness: 0.05, curveSegments: 16 });
    result.center();
    return result;
  }, []);

  return (
    <mesh geometry={geometry} position={[1.32, 1.03, -0.58]} rotation={[0.15, -0.3, 0.15]} scale={0.37}>
      <meshStandardMaterial color="#f1a6be" emissive="#b65c83" emissiveIntensity={0.27} roughness={0.35} metalness={0.05} />
    </mesh>
  );
}

function Buddy() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 1.25) * 0.08;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.14, 0.025);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.08, 0.025);
  });

  return (
    <group ref={group}>
      <mesh scale={[1.17, 1.05, 0.82]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#e8e3f4" roughness={0.36} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.01, 0.75]} scale={[0.87, 0.67, 0.1]}>
        <sphereGeometry args={[1, 40, 24]} />
        <meshStandardMaterial color="#292540" roughness={0.36} />
      </mesh>
      {[-0.29, 0.29].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.08, 0.86]} scale={[0.067, 0.12, 0.025]}>
            <sphereGeometry args={[1, 20, 16]} />
            <meshBasicMaterial color="#fff8f0" />
          </mesh>
          <mesh position={[x - 0.025, 0.12, 0.887]} scale={[0.014, 0.02, 0.008]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, -0.18, 0.79]} scale={[0.13, 0.055, 0.016]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color="#d987a8" transparent opacity={0.6} />
        </mesh>
      ))}
      <mesh position={[0, -0.23, 0.86]} scale={[0.07, 0.035, 0.017]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#e9d9e4" />
      </mesh>
      <Heart />
    </group>
  );
}

export default function AuraScene() {
  return (
    <Canvas dpr={[1, 1.7]} camera={{ position: [0, 0.1, 4.5], fov: 42 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.8} />
      <directionalLight position={[-2, 4, 5]} intensity={2.2} color="#ffffff" />
      <pointLight position={[3, -1, 3]} intensity={22} color="#eaa4c5" distance={8} />
      <Buddy />
    </Canvas>
  );
}
