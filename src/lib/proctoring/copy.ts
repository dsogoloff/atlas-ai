// =============================================================================
// DRAFT — PARENT-FACING COPY — PENDING FOUNDER APPROVAL (do NOT treat as final)
// =============================================================================
// Every string in this file is a DRAFT proposal for the parent intro /
// instructions screen, written to the brief's constraints:
//   * read-aloud mode draws a CLEAN line: reading/clarifying the WORDS = OK;
//     ANY help with the math or steering toward the answer = NOT OK.
//   * no-assistance mode: child works independently; parent does not read/help.
//   * "about this check" follows §2.4 discipline: a quick, directional check
//     that suggests a helpful starting point — NOT a diagnosis, NOT a precise
//     or complete evaluation, no "assess your child's level", no
//     accurate/guaranteed/firm-result language. Encouraging, non-shaming.
//
// The component renders these strings verbatim, so swapping in the approved
// wording after sign-off is an edit to THIS FILE ONLY — no structural change.
// Keep the §2.4 discipline above when editing.
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

/** DRAFT strings. See file banner. */
export const PARENT_INTRO_COPY: ParentIntroCopy = {
  screenTitle: "Before you begin", // DRAFT
  startButton: "Start the check", // DRAFT
  modes: {
    "read-aloud": {
      badge: "Grade 2 and under", // DRAFT
      heading: "Helping your child during this check", // DRAFT
      canTitle: "It's okay to:", // DRAFT
      canPoints: [
        // DRAFT
        "Read a question out loud for your child",
        "Tell them what a word means if they don't know it",
        "Repeat or reword the question so they understand what's being asked",
      ],
      dontTitle: "Please don't:", // DRAFT
      dontPoints: [
        // DRAFT
        "Help with the math itself",
        "Give hints, tips, or suggestions about the answer",
        "Show or tell them how to work it out",
        "Steer them toward — or away from — any answer",
      ],
      // DRAFT — the clean line (NOT vague "a little help"):
      summary:
        "Reading and explaining the words is fine. Helping with the math, or pointing toward the answer, is not — the answer should be your child's own.",
    },
    "no-assistance": {
      badge: "Grade 3 and up", // DRAFT
      heading: "Letting your child work on their own", // DRAFT
      points: [
        // DRAFT
        "Let your child read and work through the questions by themselves.",
        "Please don't read the questions aloud, explain them, or help with the answers.",
        "It's completely fine if some questions feel hard — working independently is what makes the result useful.",
        "You're welcome to stay nearby for comfort; just let the work be theirs.",
      ],
      // DRAFT — the clean line:
      summary:
        "This one is for your child to do independently — no reading aloud and no help, please.",
    },
  },
  about: {
    heading: "About this quick check", // DRAFT
    points: [
      // DRAFT — §2.4-safe: directional, not diagnostic/precise/firm.
      "It's short — usually about 10 to 15 minutes.",
      "It's a quick check to suggest a helpful starting point — where your child is comfortable, and where they might be ready to grow.",
      "It isn't a test to pass or fail, and it isn't a full or final evaluation.",
      "Your child may see some questions that feel easy and some that feel tricky — that's how it finds a good place to begin.",
      "There's nothing to study for. Just encourage them to do their best and not worry about getting everything right.",
    ],
  },
};
