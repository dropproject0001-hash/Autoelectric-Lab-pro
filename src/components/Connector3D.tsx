import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { ECUConnector, ConnectorPin } from '../types/automotive';

// Detect software WebGL to scale quality/performance as per skill guidelines
const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch (e) {
    return true;
  }
})();

interface Connector3DProps {
  connector: ECUConnector;
  selectedPinNumber: number | null;
  onSelectPin: (pinNumber: number) => void;
  orientation: 'RECEPTACLE' | 'HARNESS_PLUG';
  searchQuery?: string;
}

const Pin3D = ({ 
  position, 
  pin, 
  isSelected, 
  onSelect,
  searchQuery = ''
}: { 
  position: [number, number, number]; 
  pin: ConnectorPin; 
  isSelected: boolean; 
  onSelect: () => void;
  searchQuery?: string;
}) => {
  const isPopulated = pin.isPopulated && pin.signalType !== 'RESERVED_NC';
  const matchesSearch = searchQuery.trim() !== '' && (
    pin.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pin.functionDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pin.signalType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Pin Socket/Cavity */}
      <mesh>
        <boxGeometry args={[0.8, 0.8, 0.4]} />
        <meshStandardMaterial 
          color={isSelected ? '#FF8A00' : (matchesSearch ? '#00C2FF' : (isPopulated ? '#111C2E' : '#080D16'))} 
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      
      {/* Internal Metal Terminal (if populated) */}
      {isPopulated && (
        <mesh position={[0, 0, 0.25]}>
          <boxGeometry args={[0.4, 0.4, 0.1]} />
          <meshStandardMaterial 
            color={isSelected ? '#FFD080' : (matchesSearch ? '#E0F2FE' : '#94a3b8')} 
            emissive={isSelected ? '#FF8A00' : (matchesSearch ? '#00C2FF' : '#000000')}
            emissiveIntensity={isSelected ? 1.5 : (matchesSearch ? 2 : 0)}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Glow for selected or search-matched pin */}
      {(isSelected || matchesSearch) && !isSoftwareGl && (
        <pointLight intensity={matchesSearch && !isSelected ? 1.0 : 1.5} distance={3} color={matchesSearch && !isSelected ? '#00C2FF' : '#FF8A00'} position={[0, 0, 0.5]} />
      )}
    </group>
  );
};

const ConnectorHousing = ({ 
  connector, 
  selectedPinNumber, 
  onSelectPin,
  orientation,
  searchQuery
}: Connector3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { gl, scene, camera } = useThree();
  
  // Adjust spacing
  const spacing = 1.2;
  const totalWidth = (connector.cols - 1) * spacing;
  const totalHeight = (connector.rows - 1) * spacing;

  // On-demand rendering optimization: render when orientation or selection changes
  useEffect(() => {
    gl.render(scene, camera);
  }, [orientation, selectedPinNumber, searchQuery, connector, gl, scene, camera]);

  return (
    <group ref={groupRef} rotation={[0, orientation === 'HARNESS_PLUG' ? Math.PI : 0, 0]}>
      {/* Main Plastic Housing */}
      <mesh position={[0, 0, -1]}>
        <boxGeometry args={[totalWidth + 4, totalHeight + 4, 2]} />
        <meshStandardMaterial color="#0B1220" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Label on top */}
      <Text
        position={[0, totalHeight/2 + 2.5, 0.1]}
        fontSize={0.6}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {connector.name.toUpperCase()}
      </Text>

      {/* Pin Grid */}
      {connector.pins.map((pin) => {
        const row = pin.row || 1;
        const col = pin.col || pin.pinNumber;
        
        // Calculate 3D position
        const x = (col - 1 - (connector.cols - 1) / 2) * spacing;
        const y = ((connector.rows - row) - (connector.rows - 1) / 2) * spacing;

        return (
          <Pin3D
            key={`${pin.connectorId}-${pin.pinNumber}`}
            position={[x, y, 0]}
            pin={pin}
            isSelected={selectedPinNumber === pin.pinNumber}
            onSelect={() => onSelectPin(pin.pinNumber)}
            searchQuery={searchQuery}
          />
        );
      })}
    </group>
  );
};

export const Connector3D: React.FC<Connector3DProps> = (props) => {
  return (
    <div className="w-full h-[500px] bg-[#080D16] relative rounded-2xl overflow-hidden border border-white/5 shadow-inner group">
      <Canvas 
        shadows={!isSoftwareGl} 
        dpr={isSoftwareGl ? 1 : [1, 2]}
        gl={{ 
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        frameloop="demand" // Performance optimization: only render when state changes
      >
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={40} />
        <ambientLight intensity={0.4} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow={!isSoftwareGl} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        
        <React.Suspense fallback={null}>
          <ConnectorHousing {...props} />
          <Environment preset="city" />
          {!isSoftwareGl && (
            <ContactShadows position={[0, -6, 0]} opacity={0.4} scale={20} blur={2.5} far={4.5} />
          )}
        </React.Suspense>

        <OrbitControls 
          enablePan={false} 
          minDistance={8} 
          maxDistance={25}
          makeDefault 
          enableDamping={!isSoftwareGl}
        />
      </Canvas>
      
      {/* 3D View Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none bg-black/20 backdrop-blur-sm p-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF8A00] shadow-[0_0_8px_rgba(255,138,0,0.5)]" />
          <span className="text-[10px] font-mono text-slate-300">SELECTED PIN</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#111C2E] border border-white/10" />
          <span className="text-[10px] font-mono text-slate-400">POPULATED TERMINAL</span>
        </div>
        {isSoftwareGl && (
          <div className="mt-1 pt-1 border-t border-white/5 text-[9px] font-mono text-amber-500/70">
            LITE RENDER MODE ACTIVE
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>
    </div>
  );
};
