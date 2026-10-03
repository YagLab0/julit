"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BRAND_SCALE } from "./brand";
import { bagCount, MAX_BAGS } from "./batch-display";
export { bagCount, TONNES_PER_BAG } from "./batch-display";

const BAG = { w: 0.62, h: 0.72, gap: 0.08 };
const GRID = 3; // bags per row/column in one layer
const STEP = BAG.w + BAG.gap;
const BASE_H = 0.14;
const DROP_HEIGHT = 2.4;
const DROP_DURATION = 0.55;
const DROP_STAGGER = 0.07;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Bag slots: fill 3×3 layers bottom-up, centered on the pallet. */
function bagSlots(count: number): THREE.Vector3[] {
  const offset = ((GRID - 1) * STEP) / 2;
  return Array.from({ length: count }, (_, i) => {
    const layer = Math.floor(i / (GRID * GRID));
    const inLayer = i % (GRID * GRID);
    return new THREE.Vector3(
      (inLayer % GRID) * STEP - offset,
      BASE_H + BAG.h / 2 + layer * (BAG.h + 0.02),
      Math.floor(inLayer / GRID) * STEP - offset
    );
  });
}

/** Soft radial shadow under the pallet (cheap contact shadow). */
function useShadowTexture() {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    g.addColorStop(0, "rgba(0,0,0,0.45)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Bags({ count }: { count: number }) {
  const slots = useMemo(() => bagSlots(count), [count]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const elapsed = useRef(0);

  const parts = useMemo(
    () => ({
      body: new RoundedBoxGeometry(BAG.w, BAG.h, BAG.w, 4, 0.09),
      band: new THREE.BoxGeometry(BAG.w + 0.012, 0.09, BAG.w + 0.012),
      loop: new THREE.TorusGeometry(0.06, 0.014, 8, 16, Math.PI),
      fabric: new THREE.MeshStandardMaterial({
        color: "#f1efe9",
        roughness: 0.92,
      }),
      brand: new THREE.MeshStandardMaterial({
        color: BRAND_SCALE[600],
        roughness: 0.6,
      }),
    }),
    []
  );
  useEffect(
    () => () => Object.values(parts).forEach((p) => p.dispose()),
    [parts]
  );

  // Staggered drop-in; reduced motion skips straight to the final pose.
  useFrame((_, delta) => {
    elapsed.current += delta;
    const reduce = prefersReducedMotion();
    slots.forEach((slot, i) => {
      const g = refs.current[i];
      if (!g) return;
      const t = reduce
        ? 1
        : THREE.MathUtils.clamp(
            (elapsed.current - i * DROP_STAGGER) / DROP_DURATION,
            0,
            1
          );
      const ease = 1 - Math.pow(1 - t, 3);
      g.position.set(slot.x, slot.y + (1 - ease) * DROP_HEIGHT, slot.z);
      g.visible = t > 0;
    });
  });

  const loopY = BAG.h / 2 - 0.01;
  const loopXZ = BAG.w / 2 - 0.1;

  return (
    <>
      {slots.map((slot, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
          position={slot}
          visible={false}
        >
          <mesh
            geometry={parts.body}
            material={parts.fabric}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={parts.band}
            material={parts.brand}
            position-y={0.08}
          />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh
                key={`${sx}${sz}`}
                geometry={parts.loop}
                material={parts.fabric}
                position={[sx * loopXZ, loopY, sz * loopXZ]}
                rotation-y={Math.PI / 4 + (sx * sz > 0 ? 0 : Math.PI / 2)}
              />
            ))
          )}
        </group>
      ))}
    </>
  );
}

function Pallet() {
  const size = GRID * STEP + 0.18;
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(size, BASE_H, size)),
    [size]
  );
  useEffect(() => () => edges.dispose(), [edges]);

  return (
    <group position-y={BASE_H / 2}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[size, BASE_H, size]} />
        <meshStandardMaterial
          color={BRAND_SCALE[950]}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={BRAND_SCALE[400]} />
      </lineSegments>
    </group>
  );
}

/** Tilted emissive ring orbiting the stack: the on-chain token. */
function TokenRing({ height }: { height: number }) {
  const ring = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const g = ring.current;
    if (!g || prefersReducedMotion()) return;
    elapsed.current += delta;
    g.rotation.y += delta * 0.6;
    g.position.y = height + Math.sin(elapsed.current * 1.2) * 0.06;
  });

  const radius = (GRID * STEP) / 2 + 0.4;
  return (
    <group ref={ring} position-y={height} rotation-x={0.18}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[radius, 0.012, 12, 128]} />
        <meshStandardMaterial
          color={BRAND_SCALE[400]}
          emissive={BRAND_SCALE[500]}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}
          >
            <octahedronGeometry args={[0.07]} />
            <meshStandardMaterial
              color={BRAND_SCALE[200]}
              emissive={BRAND_SCALE[400]}
              emissiveIntensity={1}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Drag-to-orbit camera with gentle auto-rotation (no zoom/pan). Distance
 * follows the stack height so 1- and 2-layer batches both fit the frame.
 */
function Controls({
  target,
  distance,
}: {
  target: [number, number, number];
  distance: number;
}) {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, dom);
    c.enableZoom = false;
    c.enablePan = false;
    c.enableDamping = true;
    c.minPolarAngle = Math.PI / 5;
    c.maxPolarAngle = Math.PI / 2.2;
    c.autoRotate = !prefersReducedMotion();
    c.autoRotateSpeed = 0.8;
    // OrbitControls sets touch-action:none, which kills touch scrolling.
    // pan-y hands vertical swipes back to the modal scroll while horizontal
    // drags still orbit the stack.
    c.domElement?.style.setProperty("touch-action", "pan-y");
    return c;
  }, [camera, dom]);

  useEffect(() => {
    // Keep the current viewing angle, only re-aim and re-frame.
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.set(...target);
    camera.position.copy(controls.target).addScaledVector(dir, distance);
    controls.update();
  }, [camera, controls, target, distance]);
  useEffect(() => () => controls.dispose(), [controls]);

  useFrame(() => controls.update());

  return null;
}

function Scene({
  batchId,
  volumeTonnes,
}: {
  batchId: string;
  volumeTonnes: number;
}) {
  const count = Math.min(bagCount(volumeTonnes), MAX_BAGS);
  const layers = Math.ceil(count / (GRID * GRID));
  const stackTop = BASE_H + layers * (BAG.h + 0.02);
  const target = useMemo<[number, number, number]>(
    () => [0, stackTop / 2, 0],
    [stackTop]
  );
  const shadow = useShadowTexture();

  return (
    <>
      <hemisphereLight args={["#ffffff", BRAND_SCALE[900], 0.9]} />
      <directionalLight
        position={[3.5, 6, 2.5]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[-4, 2, -3]}
        intensity={0.6}
        color={BRAND_SCALE[200]}
      />

      <mesh rotation-x={-Math.PI / 2} position-y={0.001} scale={4.6}>
        <planeGeometry />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>

      <Pallet />
      {/* Keyed by batch so the drop-in replays on every selection. */}
      <Bags key={batchId} count={count} />
      <TokenRing height={stackTop + 0.25} />
      <Controls target={target} distance={4.4 + stackTop * 1.5} />
    </>
  );
}

/** 3D batch: big bags of Li₂CO₃ on a pallet, ringed by its on-chain token. */
export function BatchModel({
  batchId,
  volumeTonnes,
}: {
  batchId: string;
  volumeTonnes: number;
}) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [3.7, 2.7, 3.7], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Scene batchId={batchId} volumeTonnes={volumeTonnes} />
    </Canvas>
  );
}
