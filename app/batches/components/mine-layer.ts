import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type CustomRenderMethodInput,
  type Map as MapLibreMap,
} from "maplibre-gl";
import * as THREE from "three";
import { originCoordinates, type Origin } from "../data/origins";
import { createMineModel } from "./mine-geometry";
import { CLUSTER_MAX_ZOOM } from "./map-style";

type MineScene = {
  origin: Origin;
  anchor: MercatorCoordinate;
  scene: THREE.Scene;
  colors: Map<THREE.MeshStandardMaterial, THREE.Color>;
};

/** One shared WebGL context; rigid models sit at their plant's terrain elevation. */
export class MineLayer implements CustomLayerInterface {
  readonly id = "mines";
  readonly type = "custom";
  readonly renderingMode = "3d";
  private map: MapLibreMap | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera = new THREE.Camera();
  private transform = new THREE.Matrix4();
  private scale = new THREE.Vector3();
  private scenes = new Map<string, MineScene>();
  private selectedId: string | null = null;

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
    });
    this.renderer.autoClear = false;
  }

  setOrigins(origins: Origin[]) {
    for (const [id, mine] of this.scenes) {
      if (origins.some((origin) => origin.id === id)) continue;
      this.disposeScene(mine);
      this.scenes.delete(id);
    }
    for (const origin of origins) {
      const existing = this.scenes.get(origin.id);
      if (existing) {
        existing.origin = origin;
        existing.anchor = MercatorCoordinate.fromLngLat(
          originCoordinates(origin)
        );
        continue;
      }
      const scene = new THREE.Scene();
      const model = createMineModel();
      const light = new THREE.DirectionalLight("#fff6e3", 2.2);
      light.position.set(-3000, -4000, 6000);
      scene.add(model, light, new THREE.AmbientLight("#ffffff", 1.7));
      const colors = new Map<THREE.MeshStandardMaterial, THREE.Color>();
      model.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          const mat = node.material as THREE.MeshStandardMaterial;
          if (!colors.has(mat)) colors.set(mat, mat.color.clone());
        }
      });
      this.scenes.set(origin.id, {
        origin,
        anchor: MercatorCoordinate.fromLngLat(originCoordinates(origin)),
        scene,
        colors,
      });
    }
    this.setSelectedId(this.selectedId);
  }

  setSelectedId(selectedId: string | null) {
    this.selectedId = selectedId;
    const muted = new THREE.Color("#8b9993");
    for (const [id, mine] of this.scenes) {
      for (const [material, color] of mine.colors) {
        material.color.copy(color);
        if (selectedId && id !== selectedId) material.color.lerp(muted, 0.8);
      }
    }
    this.map?.triggerRepaint();
  }

  render(_gl: WebGL2RenderingContext, args: CustomRenderMethodInput) {
    if (!this.map || !this.renderer || this.map.getZoom() < CLUSTER_MAX_ZOOM) {
      return;
    }
    this.renderer.resetState();
    for (const mine of this.scenes.values()) {
      const elevation = this.map.queryTerrainElevation(
        originCoordinates(mine.origin)
      );
      if (elevation === null) continue;
      const units = mine.anchor.meterInMercatorCoordinateUnits();
      this.transform
        .makeTranslation(mine.anchor.x, mine.anchor.y, elevation * units)
        .scale(this.scale.set(units, -units, units));
      this.camera.projectionMatrix
        .fromArray(args.defaultProjectionData.mainMatrix)
        .multiply(this.transform);
      this.renderer.render(mine.scene, this.camera);
    }
  }

  private disposeScene(mine: MineScene) {
    mine.scene.traverse((node) => {
      if (node instanceof THREE.Mesh) node.geometry.dispose();
    });
    for (const material of mine.colors.keys()) material.dispose();
    mine.scene.clear();
  }

  onRemove() {
    for (const mine of this.scenes.values()) this.disposeScene(mine);
    this.scenes.clear();
    this.renderer?.dispose();
    this.renderer = null;
    this.map = null;
  }
}
