// Brand colors for the JS realm (MapLibre paint + WebGPU shader), which
// can't read CSS variables. Keep in sync with the --color-brand-* scale in
// app/globals.css (plain @theme block) — same hex values, single hue knob.

export const BRAND_SCALE = {
  50: "#f0fdfa",
  100: "#ccfbf1",
  200: "#99f6e4",
  300: "#5eead4",
  400: "#2dd4bf",
  500: "#14b8a6",
  600: "#0d9488",
  700: "#0f766e",
  800: "#115e59",
  900: "#134e4a",
  950: "#042f2e",
} as const;

/** Map accents + marker glow. */
export const BRAND = BRAND_SCALE[600];

/** Shader tint (0–1 RGB) derived from BRAND. */
export const BRAND_RGB: [number, number, number] = [0.05, 0.58, 0.53];
