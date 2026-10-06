"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BRAND_RGB } from "./brand";

export type GlowPin = {
  /** Position in CSS px relative to the map container. */
  x: number;
  y: number;
  /** Selected origin: stronger glow. */
  selected: boolean;
  /** Another origin is selected: dimmed glow. */
  dimmed: boolean;
};

export type GlowFrame = { pins: GlowPin[] };

const MAX_PINS = 16;

// Expanding rings + soft halo over each origin pin.
// Premultiplied output: the canvas composites transparently over the map.
// (Wind streaks from lithium-passport intentionally omitted: visual demo
// without the weather layer.)
const GLOW_SHADER = /* wgsl */ `
struct Params {
  size: vec2f,
  time: f32,
  count: f32,
  dpr: f32,
};
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> pins: array<vec4f>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = uv * params.size;
  let brand = vec3f(${BRAND_RGB.join(", ")});
  var alpha = 0.0;

  for (var i = 0u; i < u32(params.count); i = i + 1u) {
    let pin = pins[i];
    let d = distance(p, pin.xy) / params.dpr;
    let boost = 1.0 + pin.z * 0.8;
    let fade = 1.0 - pin.w * 0.8;
    var pinAlpha = 0.0;

    // Central halo.
    pinAlpha += exp(-d * d / (2.0 * 18.0 * 18.0)) * 0.22 * boost;

    // Two offset rings that expand and fade.
    for (var k = 0u; k < 2u; k = k + 1u) {
      let phase = fract(params.time * 0.45 + f32(k) * 0.5 + f32(i) * 0.17);
      let radius = mix(10.0, 70.0 * boost, phase);
      let ring = exp(-pow((d - radius) / 2.6, 2.0));
      pinAlpha += ring * (1.0 - phase) * 0.55 * boost;
    }
    alpha += pinAlpha * fade;
  }

  let a = clamp(alpha, 0.0, 0.85);
  return vec4f(brand * a, a);
}
`;

/**
 * WebGPU (vgpu) layer over the map. Mounted inside MapLibre's canvas
 * container so it sits between the map and the HTML markers. If the browser
 * has no WebGPU nothing renders: markers already have their CSS pulse.
 */
export function PointGlowOverlay({
  container,
  getFrame,
}: {
  container: HTMLElement;
  getFrame: () => GlowFrame;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getFrameRef = useRef(getFrame);

  useEffect(() => {
    getFrameRef.current = getFrame;
  }, [getFrame]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function start() {
      const canvas = canvasRef.current;
      if (!canvas || !("gpu" in navigator)) return;

      try {
        const { init, surface, effect, frameLoop, clock, storage } =
          await import("vgpu");
        const gpu = await init();
        if (disposed) {
          gpu.dispose();
          return;
        }

        const canvasSurface = surface(gpu, canvas, {
          dpr: [1, 2],
          clearColor: [0, 0, 0, 0],
        });
        const pinBuffer = storage(gpu, MAX_PINS * 16, "read");
        const pinData = new Float32Array(MAX_PINS * 4);

        const glow = effect(gpu, GLOW_SHADER, {
          label: "point-glow",
          set: {
            params: {
              size: canvasSurface.size,
              time: 0,
              count: 0,
              dpr: canvasSurface.dpr,
            },
            pins: pinBuffer,
          },
        });

        canvasSurface.onResize(({ dpr }) => {
          glow.set({ params: { size: canvasSurface.size, dpr } });
        });

        const time = clock(gpu);
        const loop = frameLoop(gpu, (frame) => {
          const { pins: allPins } = getFrameRef.current();
          const pins = allPins.slice(0, MAX_PINS);
          const dpr = canvasSurface.dpr;
          pinData.fill(0);
          pins.forEach((pin, i) => {
            pinData[i * 4] = pin.x * dpr;
            pinData[i * 4 + 1] = pin.y * dpr;
            pinData[i * 4 + 2] = pin.selected ? 1 : 0;
            pinData[i * 4 + 3] = pin.dimmed ? 1 : 0;
          });
          pinBuffer.write(pinData);
          glow.set({
            params: {
              time: time.time,
              count: pins.length,
            },
          });
          frame.pass(canvasSurface, glow);
        });

        cleanup = () => {
          loop.stop();
          gpu.dispose();
        };
      } catch (err) {
        console.info("WebGPU unavailable; using the CSS pulse.", err);
      }
    }

    start();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
    />,
    container
  );
}
