// CI runs `tsc --noEmit` with no prior `next build`, so the generated
// next-env.d.ts (gitignored) is absent there and static image imports
// (*.png) have no module type. This committed reference supplies the same
// declarations in both environments; TypeScript dedupes it against
// next-env.d.ts when that file exists locally.
/// <reference types="next/image-types/global" />
