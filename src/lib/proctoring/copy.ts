// =============================================================================
// PARENT-FACING COPY — FINAL, FOUNDER-APPROVED 2026-06-22
// =============================================================================
// The strings below are the approved wording for the parent intro /
// instructions screen. They follow the brief's constraints:
//   * read-aloud mode draws a CLEAN line: reading/clarifying the WORDS = OK;
//     ANY help with the math or steering toward the answer = NOT OK.
//   * no-assistance mode: child works independently; the parent may explain a
//     specific concept (e.g. a unit conversion) but does not work the math.
//   * "about this test" follows §2.4 discipline: a quick, directional check
//     that suggests a helpful starting point — NOT a diagnosis, NOT a precise
//     or complete evaluation, no "assess your child's level", no
//     accurate/guaranteed/firm-result language. Encouraging, non-shaming.
//
// The component renders these strings verbatim, so any future wording change
// is an edit to THIS FILE ONLY — no structural change. Keep the §2.4
// discipline above when editing, and re-confirm with the founder: this is
// parent-facing claims language.
// =============================================================================

import type { ProctoringMode } from "./mode";

export interface ModeCopy {
  /** Short grade-band chip, e.g. "Grade 2 and under". */
  badge: string;
  heading: string;
  /** Optional positive-list title + items (read-aloud mode). */
  canTitle?: string;
  canPoints?: readonly string[];
  /** Optional prohibition-list title + items. */
  dontTitle?: string;
  dontPoints?: readonly string[];
  /** Optional closing note under the prohibition list (the rationale for the
   *  whole list). */
  dontNote?: string;
  /** Generic points list (no-assistance mode). */
  points?: readonly string[];
  /** The one-line clean takeaway. */
  summary: string;
}

export interface AboutCopy {
  heading: string;
  points: readonly string[];
}

export interface ParentIntroCopy {
  screenTitle: string;
  startButton: string;
  modes: Record<ProctoringMode, ModeCopy>;
  about: AboutCopy;
}

/** FINAL, founder-approved 2026-06-22. See file banner. */
export const PARENT_INTRO_COPY: ParentIntroCopy = {
  screenTitle: "Before you begin",
  startButton: "Start the assessment",
  modes: {
    "read-aloud": {
      badge: "Grade 2 and under",
      heading: "Helping your child during this check",
      canTitle: "It's okay to:",
      canPoints: [
        "Read a question out loud for your child",
        "Tell them what a word means if they don't know it",
        "Repeat or reword the question so they understand what's being asked",
      ],
      dontTitle: "Please don't:",
      dontPoints: [
        "Help with the math itself",
        "Give hints, tips, or suggestions about the answer",
        "Show or tell them how to work it out",
        "Steer them toward — or away from — any answer",
      ],
      // The boxed clean line (NOT vague "a little help"):
      summary:
        "Reading and explaining the words is fine. Helping with the math, or pointing toward the answer, is not — the answer should be your child's own.",
    },
    "no-assistance": {
      badge: "Grade 3 and up",
      heading: "Letting your child work on their own",
      points: [
        "Let your child read and work through the questions by themselves.",
        "The child can use pen and paper to work out the answers.",
        "Please don't read the questions aloud, explain them, or help with the answers.",
        'You can help your child with specific concepts — e.g. when dealing with metric measures (kg, km, m), you can explain "how many meters are in a kilometer" and then let the child work out the math.',
        "It's completely fine if some questions feel hard — working independently is what makes the result useful.",
        "If the child does not know the answer, don't force it — it's expected. Encourage them to move forward rather than get stuck.",
        "You're welcome to stay nearby for comfort; just let the work be theirs.",
        "There's nothing to study for. Just encourage them to do their best and not worry about getting everything right.",
      ],
      // The boxed clean line:
      summary:
        "This one is for your child to do independently — no reading aloud and no help, please.",
    },
  },
  about: {
    heading: "About this test",
    points: [
      "This is a short test designed to provide our instructors with a high-level assessment of your child's comfort with certain mathematical concepts. The results will feed the comprehensive test, which is administered upon enrollment and then regularly to monitor a student's progress.",
      "This short test should take around 10–15 minutes, but if your child needs more time — that's perfectly fine.",
      "It isn't a test to pass or fail, and it isn't a full or final evaluation.",
      "Your child may see some questions that feel easy and some that feel tricky — that's how our model finds a good place to begin.",
    ],
  },
};
