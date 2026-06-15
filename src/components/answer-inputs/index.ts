// Answer-input components + their pure answer-assembly helpers.
// Imported as "@/components/answer-inputs".

export { EquationFill, blankIds, buildBlanksAnswer } from "./EquationFill";
export {
  EquationSet,
  defaultRows,
  rowsToEquationSet,
} from "./EquationSet";
export type { RowDraft } from "./EquationSet";
export { VisualMC, selectIndexAnswer } from "./VisualMC";
export { ClickImageSingle, selectOneAnswer } from "./ClickImageSingle";
export { ClickImageMulti, selectManyAnswer } from "./ClickImageMulti";
export { ImageOrdering, orderToAnswer } from "./ImageOrdering";
export { TileFace } from "./TileFace";

export * from "./types";
