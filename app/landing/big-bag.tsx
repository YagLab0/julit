"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
import styles from "./big-bag.module.css";

type BagScene = {
  resize: () => void;
  pose: (angle: number) => void;
  render: () => boolean;
  dispose: () => void;
};

const STILL_ANGLE = 0.18;
const ROTATION_DURATION = 18000;

function createBagScene(
  three: typeof Three,
  canvas: HTMLCanvasElement,
  host: HTMLDivElement
): BagScene | null {
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!context) return null;

  const renderer = new three.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const geometries = new Set<Three.BufferGeometry>();
  const materials = new Set<Three.Material>();
  const textures = new Set<Three.Texture>();
  const ownGeometry = <T extends Three.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const ownMaterial = <T extends Three.Material>(material: T): T => {
    materials.add(material);
    return material;
  };
  function dispose() {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }

  try {
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = colorCanvas.height = 1;
    const colorContext = colorCanvas.getContext("2d");
    if (!colorContext) {
      dispose();
      return null;
    }
    const computed = getComputedStyle(host);
    function cssColor(token: string) {
      const value = computed.getPropertyValue(token).trim();
      colorContext!.clearRect(0, 0, 1, 1);
      colorContext!.fillStyle = value;
      colorContext!.fillRect(0, 0, 1, 1);
      const [red, green, blue] = colorContext!.getImageData(0, 0, 1, 1).data;
      return {
        css: value,
        color: new three.Color(
          red / 255,
          green / 255,
          blue / 255
        ).convertSRGBToLinear(),
      };
    }
    const fabricColor = cssColor("--color-card");
    const strapColor = cssColor("--color-secondary");
    const seamColor = cssColor("--color-border");
    const inkColor = cssColor("--color-primary");
    const shadowColor = cssColor("--color-foreground");
    const scene = new three.Scene();
    const camera = new three.PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(2.1, 1.4, 3.9);
    camera.lookAt(0, 0.18, 0);
    renderer.setClearColor(fabricColor.color, 0);
    renderer.outputColorSpace = three.SRGBColorSpace;
    scene.add(new three.HemisphereLight(fabricColor.color, seamColor.color, 1));
    const keyLight = new three.DirectionalLight(fabricColor.color, 2);
    keyLight.position.set(-3, 5, 4);
    scene.add(keyLight);
    const fillLight = new three.DirectionalLight(fabricColor.color, 0.4);
    fillLight.position.set(3, 1, -2);
    scene.add(fillLight);

    const bag = new three.Group();
    scene.add(bag);
    const cloth = ownMaterial(
      new three.MeshStandardMaterial({
        color: fabricColor.color,
        roughness: 0.96,
        metalness: 0,
      })
    );
    const strap = ownMaterial(
      new three.MeshStandardMaterial({
        color: strapColor.color,
        roughness: 1,
        side: three.DoubleSide,
      })
    );
    const stitching = ownMaterial(
      new three.MeshStandardMaterial({
        color: seamColor.color,
        roughness: 1,
      })
    );

    // Rounded-square cross sections swell in the middle and gather at the neck.
    const profile = [
      [-0.88, 0],
      [-0.84, 0.45],
      [-0.73, 0.67],
      [-0.48, 0.76],
      [0.12, 0.79],
      [0.51, 0.74],
      [0.69, 0.59],
      [0.82, 0.32],
      [0.88, 0],
    ];
    function surface(y: number, angle: number, offset = 0) {
      let segment = 0;
      while (segment < profile.length - 2 && y > profile[segment + 1][0])
        segment++;
      const [startY, startRadius] = profile[segment];
      const [endY, endRadius] = profile[segment + 1];
      const fraction = Math.max(0, Math.min(1, (y - startY) / (endY - startY)));
      const smooth = fraction * fraction * (3 - 2 * fraction);
      const radius = startRadius + (endRadius - startRadius) * smooth;
      const envelope = Math.sin((Math.PI * (y + 0.88)) / 1.76);
      const wrinkle =
        envelope *
        (0.012 * Math.sin(angle * 20 + y * 17) +
          0.008 * Math.sin(angle * 7 - y * 11));
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      return new three.Vector3(
        Math.sign(cosine) *
          Math.pow(Math.abs(cosine), 0.56) *
          (radius + wrinkle + offset),
        y + envelope * 0.007 * Math.sin(angle * 12 + y * 7),
        Math.sign(sine) *
          Math.pow(Math.abs(sine), 0.56) *
          (radius + wrinkle + offset) *
          0.79
      );
    }
    const radialSegments = 96;
    const verticalSegments = 48;
    const positions = new Float32Array(
      (radialSegments + 1) * (verticalSegments + 1) * 3
    );
    const indices: number[] = [];
    for (let row = 0; row <= verticalSegments; row++) {
      const y = -0.88 + (row / verticalSegments) * 1.76;
      for (let column = 0; column <= radialSegments; column++) {
        const point = surface(y, (column / radialSegments) * Math.PI * 2);
        point.toArray(positions, (row * (radialSegments + 1) + column) * 3);
        if (row < verticalSegments && column < radialSegments) {
          const a = row * (radialSegments + 1) + column;
          const b = a + radialSegments + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const bodyGeometry = ownGeometry(new three.BufferGeometry());
    bodyGeometry.setAttribute(
      "position",
      new three.BufferAttribute(positions, 3)
    );
    bodyGeometry.setIndex(indices);
    bodyGeometry.computeVertexNormals();
    bag.add(new three.Mesh(bodyGeometry, cloth));

    // Four continuous stitched corner seams make the soft sack construction legible.
    for (const angle of [
      Math.PI / 4,
      (Math.PI * 3) / 4,
      (Math.PI * 5) / 4,
      (Math.PI * 7) / 4,
    ]) {
      const points = Array.from({ length: 25 }, (_, index) =>
        surface(-0.75 + (index / 24) * 1.46, angle, 0.009)
      );
      const seam = ownGeometry(
        new three.TubeGeometry(
          new three.CatmullRomCurve3(points),
          40,
          0.006,
          4,
          false
        )
      );
      bag.add(new three.Mesh(seam, stitching));
    }

    // A hollow arch extruded as a thin fabric band, not a solid handle.
    const loopShape = new three.Shape();
    loopShape.moveTo(-0.15, 0);
    loopShape.bezierCurveTo(-0.23, 0.53, -0.13, 0.62, 0, 0.62);
    loopShape.bezierCurveTo(0.13, 0.62, 0.23, 0.53, 0.15, 0);
    loopShape.lineTo(0.09, 0);
    loopShape.bezierCurveTo(0.15, 0.44, 0.1, 0.54, 0, 0.54);
    loopShape.bezierCurveTo(-0.1, 0.54, -0.15, 0.44, -0.09, 0);
    loopShape.closePath();
    const loopGeometry = ownGeometry(
      new three.ExtrudeGeometry(loopShape, {
        depth: 0.035,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.008,
        bevelThickness: 0.008,
        curveSegments: 16,
      })
    );
    for (const x of [-0.51, 0.51]) {
      for (const z of [-0.4, 0.4]) {
        const loop = new three.Mesh(loopGeometry, strap);
        loop.position.set(x, 0.64, z);
        loop.rotation.y = x > 0 ? -0.2 : 0.2;
        loop.rotation.z = x > 0 ? -0.08 : 0.08;
        bag.add(loop);
      }
    }
    const neckGeometry = ownGeometry(
      new three.CylinderGeometry(0.17, 0.25, 0.15, 24)
    );
    const neck = new three.Mesh(neckGeometry, cloth);
    neck.position.y = 0.84;
    bag.add(neck);
    const neckSeam = new three.Mesh(
      ownGeometry(new three.TorusGeometry(0.22, 0.013, 5, 32)),
      stitching
    );
    neckSeam.rotation.x = Math.PI / 2;
    neckSeam.position.y = 0.8;
    bag.add(neckSeam);

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 1024;
    labelCanvas.height = 512;
    const labelContext = labelCanvas.getContext("2d");
    if (!labelContext) {
      dispose();
      return null;
    }
    labelContext.fillStyle = fabricColor.css;
    labelContext.fillRect(0, 0, 1024, 512);
    labelContext.strokeStyle = inkColor.css;
    labelContext.lineWidth = 8;
    labelContext.strokeRect(12, 12, 1000, 488);
    labelContext.fillStyle = inkColor.css;
    labelContext.textAlign = "center";
    labelContext.textBaseline = "middle";
    labelContext.font = "600 160px Arial, sans-serif";
    labelContext.fillText("Li₂CO₃", 512, 215);
    labelContext.font = "500 45px Arial, sans-serif";
    labelContext.fillText("CARBONATO DE LITIO", 512, 368);
    const labelTexture = new three.CanvasTexture(labelCanvas);
    textures.add(labelTexture);
    labelTexture.colorSpace = three.SRGBColorSpace;
    labelTexture.anisotropy = Math.min(
      4,
      renderer.capabilities.getMaxAnisotropy()
    );
    const label = new three.Mesh(
      ownGeometry(new three.PlaneGeometry(0.98, 0.49)),
      ownMaterial(new three.MeshBasicMaterial({ map: labelTexture }))
    );
    label.position.set(0, -0.05, 0.64);
    bag.add(label);

    const shadow = new three.Mesh(
      ownGeometry(new three.CircleGeometry(0.84, 48)),
      ownMaterial(
        new three.MeshBasicMaterial({
          color: shadowColor.color,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
        })
      )
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.y = 0.78;
    shadow.position.y = -0.91;
    scene.add(shadow);
    bag.rotation.y = STILL_ANGLE;

    return {
      resize() {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // Keep the complete lifting loops in frame even in a narrow card.
        camera.position
          .set(2.1, 1.4, 3.9)
          .multiplyScalar(Math.max(1, 1.1 / camera.aspect));
        camera.lookAt(0, 0.18, 0);
        camera.updateProjectionMatrix();
      },
      pose(angle) {
        bag.rotation.y = angle;
      },
      render() {
        if (context.isContextLost()) return false;
        renderer.render(scene, camera);
        return !context.isContextLost();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

export function BigBag() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let loading = false;
    let failed = false;
    let intersecting = false;
    let keyboard = false;
    let frame = 0;
    let previousTime: number | null = null;
    let angle = STILL_ANGLE;
    let graphics: BagScene | null = null;
    const visible = () =>
      intersecting && document.visibilityState === "visible";

    function cancelFrame() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
    }
    function fail() {
      failed = true;
      cancelFrame();
      delete host!.dataset.rendered;
      canvas!.removeEventListener("webglcontextlost", contextLost);
      graphics?.dispose();
      graphics = null;
    }
    function render() {
      if (!graphics || disposed || failed) return;
      try {
        if (!graphics.render()) {
          fail();
          return;
        }
        host!.dataset.rendered = "true";
      } catch {
        fail();
      }
    }
    function tick(time: number) {
      frame = 0;
      if (disposed || failed || !graphics) return;
      if (!visible() || reducedMotion.matches || keyboard) {
        updateVisibility();
        return;
      }
      if (previousTime !== null) {
        angle =
          (angle + ((time - previousTime) / ROTATION_DURATION) * Math.PI * 2) %
          (Math.PI * 2);
      }
      previousTime = time;
      graphics.pose(angle);
      render();
      if (!failed) frame = window.requestAnimationFrame(tick);
    }
    function updateVisibility() {
      if (!graphics || disposed || failed) return;
      if (reducedMotion.matches || keyboard) {
        cancelFrame();
        angle = STILL_ANGLE;
        graphics.pose(angle);
        render();
        return;
      }
      if (!visible()) {
        cancelFrame();
        return;
      }
      if (!frame) frame = window.requestAnimationFrame(tick);
    }
    function onKeyboard() {
      keyboard = true;
      updateVisibility();
    }
    function onPointer() {
      keyboard = false;
      updateVisibility();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      fail();
    }
    function resize() {
      if (!graphics || disposed || failed) return;
      try {
        graphics.resize();
        render();
      } catch {
        fail();
      }
    }
    async function load() {
      if (loading || disposed || failed) return;
      loading = true;
      try {
        // Defer the graphics bundle until this decorative widget nears the viewport.
        const three = await import("three");
        if (disposed) return;
        graphics = createBagScene(three, canvas!, host!);
        if (!graphics) {
          fail();
          return;
        }
        graphics.resize();
        graphics.pose(STILL_ANGLE);
        render();
        updateVisibility();
      } catch {
        if (!disposed) fail();
      }
    }

    canvas.addEventListener("webglcontextlost", contextLost);
    reducedMotion.addEventListener("change", updateVisibility);
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("keydown", onKeyboard);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", resize);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    const viewportObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              intersecting = entry.isIntersecting;
              updateVisibility();
            },
            { threshold: 0.05 }
          )
        : null;
    const loadObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              if (!entry.isIntersecting) return;
              loadObserver?.disconnect();
              void load();
            },
            { rootMargin: "240px" }
          )
        : null;
    viewportObserver?.observe(host);
    loadObserver?.observe(host);
    if (!loadObserver) {
      intersecting = true;
      void load();
    }

    return () => {
      disposed = true;
      cancelFrame();
      loadObserver?.disconnect();
      viewportObserver?.disconnect();
      resizeObserver?.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      reducedMotion.removeEventListener("change", updateVisibility);
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("keydown", onKeyboard);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", resize);
      graphics?.dispose();
      delete host.dataset.rendered;
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.bag} aria-hidden="true">
      <svg className={styles.fallback} viewBox="0 0 300 245" focusable="false">
        <ellipse className={styles.shadow} cx="153" cy="222" rx="74" ry="10" />
        <path
          className={styles.loop}
          d="M94 79C84 25 92 12 105 15C119 18 121 44 111 79M184 77C177 25 185 15 197 18C211 22 211 48 202 84"
        />
        <path
          className={styles.side}
          d="M158 70L201 84Q221 122 211 196Q207 215 183 217L154 205Z"
        />
        <path
          className={styles.fabric}
          d="M100 75Q125 60 163 72L188 84Q202 132 186 209Q146 225 97 212Q78 175 87 111Z"
        />
        <path
          className={styles.loop}
          d="M95 90C80 48 82 26 94 27C109 28 113 49 108 87M174 88C163 48 164 27 177 29C191 31 195 54 184 94"
        />
        <path
          className={styles.neck}
          d="M127 72L131 59Q144 54 157 60L160 74Z"
        />
        <path
          className={styles.seams}
          d="M99 88Q87 154 101 205M179 91Q193 148 180 207M194 100Q212 151 200 196M101 103L110 118M169 103L163 118M99 197L112 188M177 198L163 189M120 79Q143 86 167 82"
        />
        <rect
          className={styles.label}
          x="105"
          y="125"
          width="70"
          height="46"
          rx="2"
        />
        <text className={styles.formula} x="140" y="149" textAnchor="middle">
          Li₂CO₃
        </text>
        <text className={styles.caption} x="140" y="161" textAnchor="middle">
          CARBONATO DE LITIO
        </text>
      </svg>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
