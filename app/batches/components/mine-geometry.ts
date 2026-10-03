import * as THREE from "three";
import { BRAND_SCALE } from "./brand";

// Symbolic lithium-brine operation: exaggerated dimensions, not a surveyed site.
const COLORS = {
  earth: "#baa98e",
  salt: "#e2d7bf",
  surface: "#f5efde",
  road: "#c5b99f",
  berm: "#faf7ed",
  wall: "#cad4d0",
  roof: BRAND_SCALE[800],
  tank: "#e5eeea",
  pipe: BRAND_SCALE[600],
  ponds: [BRAND_SCALE[300], "#8bd4dc", BRAND_SCALE[500]],
};

/** Model axes: x east, y north, z up. Every part shares one terrain anchor. */
export function createMineModel() {
  const model = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    let value = materials.get(color);
    if (!value) {
      value = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      materials.set(color, value);
    }
    return value;
  };
  const rectangle = (
    x: number,
    y: number,
    width: number,
    depth: number,
    corner = 0
  ) => {
    const left = x - width / 2;
    const right = x + width / 2;
    const bottom = y - depth / 2;
    const top = y + depth / 2;
    const shape = new THREE.Shape();
    shape.moveTo(left + corner, bottom);
    shape.lineTo(right - corner, bottom);
    shape.lineTo(right, bottom + corner);
    shape.lineTo(right, top - corner);
    shape.lineTo(right - corner, top);
    shape.lineTo(left + corner, top);
    shape.lineTo(left, top - corner);
    shape.lineTo(left, bottom + corner);
    shape.closePath();
    return shape;
  };
  const part = (
    shape: THREE.Shape,
    base: number,
    height: number,
    color: string
  ) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height - base,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1,
    });
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.z = base;
    model.add(mesh);
  };
  const box = (
    x: number,
    y: number,
    width: number,
    depth: number,
    base: number,
    height: number,
    color: string,
    corner = 0
  ) => part(rectangle(x, y, width, depth, corner), base, height, color);

  // Broad, low salt terraces replace the stock-volume pillar.
  box(-675, -525, 3300, 2700, 0, 12, COLORS.earth, 280);
  box(-675, -525, 3180, 2580, 12, 24, COLORS.salt, 240);
  box(-675, -525, 3060, 2460, 24, 32, COLORS.surface, 200);

  // Six evaporation ponds with raised berms and recessed brine.
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -1780 + col * 730;
      const y = -1250 + row * 720;
      box(x, y, 660, 590, 32, 54, COLORS.berm, 30);
      box(x, y, 598, 528, 54, 55, COLORS.ponds[col], 18);
      const rim = rectangle(x, y, 660, 590, 30);
      const inset = rectangle(x, y, 598, 528, 18);
      rim.holes.push(new THREE.Path(inset.getPoints().reverse()));
      part(rim, 54, 65, COLORS.berm);
    }
  }

  // Service lanes and collection pipes.
  box(-680, -170, 2820, 90, 32, 34, COLORS.road);
  box(-680, -1700, 2820, 90, 32, 34, COLORS.road);
  box(220, -1020, 90, 1450, 32, 34, COLORS.road);
  box(720, -680, 28, 1800, 34, 50, COLORS.pipe);
  box(420, -1050, 620, 28, 34, 50, COLORS.pipe);

  // Squat processing hall and warehouse, with contrasting roof caps.
  box(290, 230, 760, 420, 32, 235, COLORS.wall, 25);
  box(290, 230, 800, 460, 235, 260, COLORS.roof, 25);
  box(-680, 350, 920, 330, 32, 160, COLORS.wall, 20);
  box(-680, 350, 960, 370, 160, 180, COLORS.roof, 20);
  for (const x of [-970, -680, -390]) {
    box(x, 350, 48, 325, 180, 184, COLORS.berm);
  }
  box(290, 230, 710, 45, 260, 264, COLORS.pipe);
  box(520, 550, 220, 140, 32, 95, COLORS.berm, 12);

  // Faceted tanks with a teal collar.
  for (const x of [50, 350, 650]) {
    for (const [radius, base, height, color] of [
      [120, 32, 185, COLORS.tank],
      [123, 145, 163, COLORS.pipe],
      [102, 185, 199, COLORS.berm],
    ] as const) {
      const geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        height - base,
        12
      );
      geometry.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material(color));
      mesh.position.set(x, -650, (base + height) / 2);
      model.add(mesh);
    }
  }

  // Terraced salt stockpiles, not an open-pit mine.
  for (const x of [-1900, -1480]) {
    box(x, 320, 340, 340, 32, 85, COLORS.salt, 95);
    box(x, 320, 240, 240, 85, 130, COLORS.berm, 70);
    box(x, 320, 130, 130, 130, 170, COLORS.surface, 40);
  }

  // Keep the pond field east of the plant, toward the salar rather than the ridge.
  model.scale.set(-2.4, 2.4, 2.4);
  model.rotation.z = (12 * Math.PI) / 180;
  return model;
}
