// 3D entry point of the character entity: the three.js models. Kept apart from index.ts
// so the catalog and queries don't drag three.js into pages that don't render Kordi.
export { KordiModel, type KordiMotion } from "./ui/kordi-model";
export { CrownMesh } from "./ui/crown-mesh";
