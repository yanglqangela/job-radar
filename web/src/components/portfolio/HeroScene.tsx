import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, useCursor, useTexture } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { assetUrl } from "../../lib/portfolio";

type SceneProject = {
  slug: string;
  name: string;
  cover?: string;
};

const INK = "#0c1411";
const FLOOR = "#0e1713";

function CuteCharacter({ reduced }: { reduced: boolean }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (reduced || !root.current) return;
    const t = state.clock.elapsedTime;
    root.current.position.y = -0.28 + Math.sin(t * 1.7) * 0.045;
    root.current.rotation.y = THREE.MathUtils.damp(
      root.current.rotation.y,
      -0.2 + state.pointer.x * 0.3 + Math.sin(t * 0.3) * 0.12,
      2.5,
      delta,
    );
    root.current.rotation.x = THREE.MathUtils.damp(
      root.current.rotation.x,
      -state.pointer.y * 0.04,
      2.5,
      delta,
    );
    if (head.current) {
      head.current.rotation.z = THREE.MathUtils.damp(
        head.current.rotation.z,
        Math.sin(t * 1.2) * 0.025,
        3,
        delta,
      );
    }
    if (arm.current) {
      arm.current.rotation.z = THREE.MathUtils.damp(
        arm.current.rotation.z,
        -0.34 + Math.sin(t * 1.5) * 0.035,
        3,
        delta,
      );
    }
  });

  return (
    <group ref={root} position={[1.9, -0.28, 0]}>
      <mesh position={[0, -0.35, 0]} scale={[0.9, 1.04, 0.68]}>
        <sphereGeometry args={[1, 28, 20]} />
        <meshStandardMaterial color="#8fcbb3" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 0.62]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.38, 0.055, 10, 24]} />
        <meshStandardMaterial color="#d9f1e3" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.24, 20]} />
        <meshStandardMaterial color="#ffd5bf" roughness={0.86} />
      </mesh>

      <group ref={head} position={[0, 1.18, 0]}>
        <mesh scale={[0.98, 1.06, 0.84]}>
          <sphereGeometry args={[1, 28, 20]} />
          <meshStandardMaterial color="#ffd7c2" roughness={0.72} />
        </mesh>
        <mesh position={[-0.86, 0.03, 0]} scale={[0.25, 0.32, 0.18]}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color="#ffc9b4" roughness={0.78} />
        </mesh>
        <mesh position={[0.86, 0.03, 0]} scale={[0.25, 0.32, 0.18]}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color="#ffc9b4" roughness={0.78} />
        </mesh>
        <mesh position={[0, 0.4, -0.03]} scale={[1.02, 0.58, 0.88]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#4a302e" roughness={0.88} />
        </mesh>
        {[-0.38, 0, 0.38].map((x) => (
          <mesh key={x} position={[x, 0.15, 0.64]} scale={[0.3, 0.2, 0.26]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshStandardMaterial color="#4a302e" roughness={0.88} />
          </mesh>
        ))}
        {[-0.32, 0.32].map((x) => (
          <group key={x} position={[x, 0.02, 0.8]}>
            <mesh scale={[0.13, 0.17, 0.1]}>
              <sphereGeometry args={[1, 18, 14]} />
              <meshStandardMaterial color="#2a2020" roughness={0.55} />
            </mesh>
            <mesh position={[-0.035, 0.055, 0.085]} scale={0.035}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshStandardMaterial color="#fffaf0" roughness={0.28} />
            </mesh>
          </group>
        ))}
        {[-0.53, 0.53].map((x) => (
          <mesh key={x} position={[x, -0.2, 0.78]} scale={[0.18, 0.09, 0.045]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial color="#f28e91" roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, -0.05, 0.88]} scale={[0.08, 0.1, 0.08]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#efad93" roughness={0.76} />
        </mesh>
        <mesh position={[0, -0.28, 0.85]} scale={[0.16, 0.055, 0.035]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color="#a84f5d" roughness={0.65} />
        </mesh>
      </group>

      <group position={[-0.86, -0.34, 0]} rotation={[0, 0, 0.28]}>
        <mesh scale={[0.28, 0.72, 0.34]}>
          <sphereGeometry args={[1, 22, 16]} />
          <meshStandardMaterial color="#7ebda8" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.73, 0.02]} scale={0.28}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshStandardMaterial color="#ffd7c2" roughness={0.72} />
        </mesh>
      </group>
      <group ref={arm} position={[0.86, -0.05, 0]} rotation={[0, 0, -0.34]}>
        <mesh scale={[0.28, 0.7, 0.34]}>
          <sphereGeometry args={[1, 22, 16]} />
          <meshStandardMaterial color="#7ebda8" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.71, 0.02]} scale={0.28}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshStandardMaterial color="#ffd7c2" roughness={0.72} />
        </mesh>
      </group>

      {[-0.38, 0.38].map((x) => (
        <group key={x} position={[x, -1.36, 0]}>
          <mesh scale={[0.36, 0.6, 0.4]}>
            <sphereGeometry args={[1, 22, 16]} />
            <meshStandardMaterial color="#3d5d70" roughness={0.86} />
          </mesh>
          <mesh position={[0, -0.58, 0.1]} scale={[0.42, 0.22, 0.62]}>
            <sphereGeometry args={[1, 22, 16]} />
            <meshStandardMaterial color="#f6c6a9" roughness={0.86} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, -0.35, 0.68]} scale={[0.18, 0.18, 0.035]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#ef7d5f" roughness={0.65} emissive="#6d2d22" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}

function ProjectPanel({
  project,
  texture,
  position,
  rotation,
  onOpen,
}: {
  project: SceneProject;
  texture: THREE.Texture;
  position: [number, number, number];
  rotation: [number, number, number];
  onOpen: (slug: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[2.34, 1.49]} />
        <meshStandardMaterial color="#1c2a22" roughness={0.8} />
      </mesh>
      <mesh
        scale={hovered ? 1.03 : 1}
        onClick={() => onOpen(project.slug)}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[2.2, 1.375]} />
        <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, -0.72, -0.02]}>
        <planeGeometry args={[2.2, 0.012]} />
        <meshBasicMaterial color="#e2552c" toneMapped={false} fog={false} />
      </mesh>
      {hovered && (
        <Html position={[0, -0.94, 0]} center distanceFactor={10}>
          <span className="pf-panel-label">{project.name}</span>
        </Html>
      )}
    </group>
  );
}

function ProjectPanels({
  projects,
  onOpen,
}: {
  projects: SceneProject[];
  onOpen: (slug: string) => void;
}) {
  const withCover = projects.filter((project) => Boolean(project.cover)).slice(0, 3);
  if (!withCover.length) return null;
  return <PanelArc projects={withCover} onOpen={onOpen} />;
}

function PanelArc({
  projects,
  onOpen,
}: {
  projects: SceneProject[];
  onOpen: (slug: string) => void;
}) {
  const width = useThree((state) => state.size.width);
  const textures = useTexture(projects.map((project) => assetUrl(project.cover || "")));

  // 图版排在右侧的纵深弧线上，不压左侧文案；窄画布时向中线收一点，避免被裁。
  const squeeze = width < 1280 ? 0.72 : 1;
  const frames: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
  }> = [
    { position: [4.6 * squeeze, 1.5, -4.2], rotation: [0, -0.4, 0] },
    { position: [6.6 * squeeze, 3.1, -7.6], rotation: [0, -0.5, 0] },
    { position: [8.2 * squeeze, 4.6, -11.2], rotation: [0, -0.6, 0] },
  ];

  return (
    <>
      {projects.map((project, index) => (
        <ProjectPanel
          key={project.slug}
          project={project}
          texture={textures[index]}
          position={frames[index].position}
          rotation={frames[index].rotation}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}

function CameraRig({ reduced }: { reduced: boolean }) {
  const width = useThree((state) => state.size.width);
  const camera = useThree((state) => state.camera);
  const narrow = width < 620;

  useEffect(() => {
    camera.position.set(narrow ? 1.4 : 0, 1.15, 10.8);
    camera.lookAt(narrow ? 1.9 : 0.9, 0.2, 0);
  }, [camera, narrow]);

  useFrame((state, delta) => {
    if (reduced) return;
    const camera = state.camera;
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      (narrow ? 1.4 : 0) + state.pointer.x * 0.35,
      2,
      delta,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      1.15 - state.pointer.y * 0.18,
      2,
      delta,
    );
    camera.lookAt(narrow ? 1.9 : 0.9, 0.2, 0);
  });
  return null;
}

function Studio({
  projects,
  onOpen,
  reduced,
}: {
  projects: SceneProject[];
  onOpen: (slug: string) => void;
  reduced: boolean;
}) {
  const width = useThree((state) => state.size.width);
  const showPanels = width >= 1024;

  return (
    <>
      <fog attach="fog" args={[INK, 10, 26]} />

      <hemisphereLight args={["#eaf7f0", "#18261f", 1.15]} />
      <ambientLight intensity={0.72} color="#c8d8cf" />
      <directionalLight position={[3, 5, 5]} intensity={1.55} color="#fff4e5" />
      <directionalLight position={[-4, 3, 2]} intensity={0.6} color="#a8d7c2" />
      {/* 背后两盏轮廓光，让深色头发和肩膀从暗背景里分离出来 */}
      <directionalLight position={[-1.8, 3.6, -4.8]} intensity={0.72} color="#f49a78" />
      <directionalLight position={[4.2, 2.6, -3.2]} intensity={0.82} color="#79b99e" />
      <spotLight
        position={[3.2, 7, 4.5]}
        angle={0.5}
        penumbra={0.7}
        intensity={3.2}
        color="#ffe3c4"
        distance={24}
      />
      <pointLight position={[1.8, 1.8, 3]} intensity={0.7} color="#fff8e9" distance={8} />

      <mesh position={[2.6, 4.4, 4.5]} rotation={[0.15, 0, 0]}>
        <coneGeometry args={[2.4, 9, 32, 1, true]} />
        <meshBasicMaterial
          color="#ffe9cf"
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
        <circleGeometry args={[11, 64]} />
        <meshStandardMaterial color={FLOOR} roughness={0.65} metalness={0.15} />
      </mesh>
      <gridHelper args={[22, 44, "#31453a", "#1a2620"]} position={[0, -2.19, 0]} />
      <mesh position={[1.9, -2.02, 0]}>
        <cylinderGeometry args={[1.9, 2.1, 0.38, 48]} />
        <meshStandardMaterial color="#18251f" roughness={0.85} />
      </mesh>
      <mesh position={[1.9, -1.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.92, 0.015, 8, 96]} />
        <meshBasicMaterial color="#d0451b" />
      </mesh>
      <mesh position={[1.9, -2.185, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.1, 0.008, 6, 128]} />
        <meshBasicMaterial color="#31453a" transparent opacity={0.7} />
      </mesh>

      <CuteCharacter reduced={reduced} />
      {showPanels && <ProjectPanels projects={projects} onOpen={onOpen} />}

      <ContactShadows
        position={[1.9, -1.8, 0]}
        opacity={0.4}
        scale={8}
        blur={2.4}
        far={4}
        color="#000000"
      />
      <CameraRig reduced={reduced} />
    </>
  );
}

export default function HeroScene({
  projects,
  onOpen,
}: {
  projects: SceneProject[];
  onOpen: (slug: string) => void;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <Canvas
      camera={{ position: [0, 0.9, 10.8], fov: 35 }}
      dpr={[1, 1.7]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={reduced ? "demand" : "always"}
      style={{ width: "100%", height: "100%" }}
    >
      <Studio projects={projects} onOpen={onOpen} reduced={reduced} />
    </Canvas>
  );
}
