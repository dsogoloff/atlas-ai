/**
 * Atlas AI — Response Time Flagging
 *
 * Computes expected response time per item and flags responses that fall
 * outside tolerance bands. Used as a SECONDARY signal alongside correctness
 * and misconception detection — does NOT adjust scores in V1.
 *
 * Formula:  T_expected = T_read + T_solve + T_input
 *
 * Synthetic norms derived from:
 *   - Hasbrouck & Tindal (2017) silent reading fluency
 *   - AIMSweb / easyCBM math computation fluency
 *   - Expert-estimated representation costs for Singapore Math
 *
 * Swap DEFAULT_CONFIG for an empirical config (same shape) once you have
 * ≥200–300 responses per item. No callsite changes required.
 */

// ============================================================================
// TYPES
// ============================================================================

export type HalfGrade =
  | 'K.0' | 'K.5'
  | '1.0' | '1.5'
  | '2.0' | '2.5'
  | '3.0' | '3.5'
  | '4.0' | '4.5'
  | '5.0' | '5.5';

export type OperationType =
  | 'single_digit_add_sub'
  | 'multi_digit_add_sub'
  | 'multi_digit_add_sub_regroup'
  | 'multiplication_facts'
  | 'multi_digit_multiplication'
  | 'division_facts'
  | 'long_division'
  | 'fraction_basic'
  | 'fraction_operations'
  | 'decimal_operations'
  | 'percent_operations'
  | 'measurement_conversion'
  | 'geometry_basic'
  | 'algebraic_reasoning';

export type RepresentationType =
  | 'symbolic'             // e.g., "3 + 5 = ?"
  | 'pictorial'            // diagram provided, no construction needed
  | 'bar_model_required'   // student must construct/interpret a bar model
  | 'word_problem_single'  // single-step word problem
  | 'word_problem_multi';  // multi-step word problem

export type InputFormat =
  | 'multiple_choice'
  | 'numeric_entry'
  | 'drag_and_drop'
  | 'open_response';

export interface ItemTags {
  /** Target half-grade level for this item */
  half_grade: HalfGrade;
  /** Word count in the stem (exclude answer choices) */
  word_count: number;
  /** Primary operation type */
  operation_type: OperationType;
  /** Number of discrete operations the student must perform (≥1) */
  num_operations: number;
  /** Representation requirement */
  representation: RepresentationType;
  /** Input format */
  input_format: InputFormat;
}

export type FlagKind = 'invalid' | 'too_fast' | 'too_slow' | 'normal';

export interface FlagResult {
  expected_time_sec: number;
  actual_time_sec: number;
  ratio: number;
  flag: FlagKind;
  components: {
    t_read: number;
    t_solve: number;
    t_input: number;
  };
  /** Human-readable reason; populated only when flag !== 'normal' */
  reason?: string;
}

// ============================================================================
// CONFIG  (swap this object for empirical norms when available)
// ============================================================================

export interface TimeNormConfig {
  version: string;
  source: 'synthetic' | 'empirical' | 'hybrid';
  generated_at: string;

  /** Seconds per word for silent reading, by half-grade */
  reading_seconds_per_word: Record<HalfGrade, number>;

  /** Base seconds for ONE operation, by operation × half-grade (sparse) */
  solve_base_seconds: Record<OperationType, Partial<Record<HalfGrade, number>>>;

  /** Multiplier on T_solve based on representation */
  representation_multiplier: Record<RepresentationType, number>;

  /** Seconds added for input action, by format × half-grade */
  input_seconds: Record<InputFormat, Partial<Record<HalfGrade, number>>>;

  /** Tolerance bands as ratio of actual / expected (plus absolute floor) */
  tolerance: {
    /** Absolute floor in seconds — below this, flag as 'invalid' (likely
     *  accidental tap / double-submit, not a real attempt). Checked BEFORE
     *  the ratio bands. */
    invalid_below_sec: number;
    too_fast_below: number;
    too_slow_above: number;
  };
}

export const DEFAULT_CONFIG: TimeNormConfig = {
  version: 'synthetic-v1.0',
  source: 'synthetic',
  generated_at: '2026-05-05',

  // Silent reading rates ≈ 1.3× oral WCPM (Hasbrouck & Tindal 2017, mid-year)
  reading_seconds_per_word: {
    'K.0': 4.0,   // most still decoding; treat as floor
    'K.5': 3.0,
    '1.0': 2.0,   // ~30 silent wpm
    '1.5': 1.2,
    '2.0': 0.85,  // ~70 silent wpm
    '2.5': 0.65,
    '3.0': 0.50,  // ~120 silent wpm
    '3.5': 0.43,
    '4.0': 0.38,
    '4.5': 0.36,
    '5.0': 0.33,  // ~180 silent wpm
    '5.5': 0.31,
  },

  // Base solve time per operation. Sparse — only define where the operation
  // is plausibly assessable. Use ADJACENT_GRADES fallback for off-grade items.
  solve_base_seconds: {
    single_digit_add_sub: {
      'K.0': 8, 'K.5': 6, '1.0': 4, '1.5': 3, '2.0': 2.5, '2.5': 2,
    },
    multi_digit_add_sub: {
      '2.0': 6, '2.5': 5, '3.0': 4,
    },
    multi_digit_add_sub_regroup: {
      '2.5': 12, '3.0': 9, '3.5': 7, '4.0': 6,
    },
    multiplication_facts: {
      '2.5': 6, '3.0': 4, '3.5': 3, '4.0': 2.5,
    },
    multi_digit_multiplication: {
      '3.5': 25, '4.0': 18, '4.5': 14, '5.0': 12,
    },
    division_facts: {
      '3.0': 6, '3.5': 4.5, '4.0': 3.5,
    },
    long_division: {
      '4.0': 40, '4.5': 32, '5.0': 26, '5.5': 22,
    },
    fraction_basic: {
      '3.0': 12, '3.5': 9, '4.0': 7,
    },
    fraction_operations: {
      '4.0': 22, '4.5': 17, '5.0': 14, '5.5': 11,
    },
    decimal_operations: {
      '4.5': 15, '5.0': 12, '5.5': 9,
    },
    percent_operations: {
      '5.0': 18, '5.5': 14,
    },
    measurement_conversion: {
      '3.0': 15, '4.0': 12, '5.0': 10,
    },
    geometry_basic: {
      '2.0': 12, '3.0': 10, '4.0': 9, '5.0': 8,
    },
    algebraic_reasoning: {
      '4.0': 25, '5.0': 20, '5.5': 17,
    },
  },

  representation_multiplier: {
    symbolic: 1.0,
    pictorial: 1.2,
    bar_model_required: 1.5,    // LOW-CONFIDENCE — flag for empirical recalibration
    word_problem_single: 1.3,
    word_problem_multi: 1.85,
  },

  input_seconds: {
    multiple_choice: {
      'K.0': 5, 'K.5': 4, '1.0': 3.5, '1.5': 3, '2.0': 2.5,
      '2.5': 2.5, '3.0': 2, '3.5': 2, '4.0': 2, '4.5': 2, '5.0': 2, '5.5': 2,
    },
    numeric_entry: {
      'K.0': 10, 'K.5': 8, '1.0': 7, '1.5': 6, '2.0': 5,
      '2.5': 5, '3.0': 4.5, '3.5': 4, '4.0': 4, '4.5': 4, '5.0': 3.5, '5.5': 3.5,
    },
    drag_and_drop: {
      'K.0': 14, 'K.5': 12, '1.0': 10, '1.5': 9, '2.0': 8,
      '2.5': 8, '3.0': 7, '3.5': 7, '4.0': 6.5, '4.5': 6.5, '5.0': 6, '5.5': 6,
    },
    open_response: {
      'K.0': 20, 'K.5': 17, '1.0': 14, '1.5': 12, '2.0': 11,
      '2.5': 11, '3.0': 10, '3.5': 9, '4.0': 9, '4.5': 8, '5.0': 8, '5.5': 7,
    },
  },

  tolerance: {
    invalid_below_sec: 1.0,  // <1s → almost certainly not a real attempt
    too_fast_below: 0.4,     // <40% expected → likely guess / pattern-match
    too_slow_above: 2.5,     // >250% expected → struggle / distraction / interruption
  },
};

// ============================================================================
// FALLBACK CHAIN  (used when an operation isn't tabulated at the exact grade)
// ============================================================================

const ADJACENT_GRADES: Record<HalfGrade, HalfGrade[]> = {
  'K.0': ['K.5', '1.0'],
  'K.5': ['1.0', 'K.0'],
  '1.0': ['1.5', 'K.5', '2.0'],
  '1.5': ['2.0', '1.0', '2.5'],
  '2.0': ['2.5', '1.5', '3.0'],
  '2.5': ['3.0', '2.0', '3.5'],
  '3.0': ['3.5', '2.5', '4.0'],
  '3.5': ['4.0', '3.0', '4.5'],
  '4.0': ['4.5', '3.5', '5.0'],
  '4.5': ['5.0', '4.0', '5.5'],
  '5.0': ['5.5', '4.5', '4.0'],
  '5.5': ['5.0', '4.5', '4.0'],
};

function safeLookup(
  rec: Partial<Record<HalfGrade, number>>,
  half_grade: HalfGrade,
  context: string
): number {
  if (rec[half_grade] !== undefined) return rec[half_grade]!;
  for (const fb of ADJACENT_GRADES[half_grade]) {
    if (rec[fb] !== undefined) return rec[fb]!;
  }
  throw new Error(
    `No time norm for ${context} at half_grade=${half_grade} ` +
    `(no fallback hit). Extend the config or re-tag the item.`
  );
}

// ============================================================================
// FORMULA
// ============================================================================

export function computeExpectedTime(
  tags: ItemTags,
  config: TimeNormConfig = DEFAULT_CONFIG
): { t_read: number; t_solve: number; t_input: number; t_expected: number } {
  if (tags.num_operations < 1) {
    throw new Error(`num_operations must be >= 1 (got ${tags.num_operations})`);
  }
  if (tags.word_count < 0) {
    throw new Error(`word_count must be >= 0 (got ${tags.word_count})`);
  }

  const grade = tags.half_grade;

  // T_read
  const sec_per_word = config.reading_seconds_per_word[grade];
  const t_read = tags.word_count * sec_per_word;

  // T_solve
  const base_solve = safeLookup(
    config.solve_base_seconds[tags.operation_type],
    grade,
    `operation_type=${tags.operation_type}`
  );
  const rep_mult = config.representation_multiplier[tags.representation];
  const t_solve = base_solve * tags.num_operations * rep_mult;

  // T_input
  const t_input = safeLookup(
    config.input_seconds[tags.input_format],
    grade,
    `input_format=${tags.input_format}`
  );

  return {
    t_read,
    t_solve,
    t_input,
    t_expected: t_read + t_solve + t_input,
  };
}

export function flagResponseTime(
  tags: ItemTags,
  actual_time_sec: number,
  config: TimeNormConfig = DEFAULT_CONFIG
): FlagResult {
  const { t_read, t_solve, t_input, t_expected } = computeExpectedTime(tags, config);
  const ratio = actual_time_sec / t_expected;

  let flag: FlagKind = 'normal';
  let reason: string | undefined;

  // Order matters: absolute floor check precedes ratio checks. An accidental
  // 0.3s tap should be 'invalid', not 'too_fast', so it can be excluded from
  // session-level rushed/struggling aggregation rather than contaminating it.
  if (actual_time_sec < config.tolerance.invalid_below_sec) {
    flag = 'invalid';
    reason =
      `Response in ${actual_time_sec.toFixed(2)}s, below the ${config.tolerance.invalid_below_sec}s floor. ` +
      `Likely accidental submit or double-tap — not a meaningful attempt.`;
  } else if (ratio < config.tolerance.too_fast_below) {
    flag = 'too_fast';
    reason =
      `Answered in ${actual_time_sec.toFixed(1)}s vs ${t_expected.toFixed(1)}s expected ` +
      `(${(ratio * 100).toFixed(0)}%). Possible guess or pattern-match.`;
  } else if (ratio > config.tolerance.too_slow_above) {
    flag = 'too_slow';
    reason =
      `Answered in ${actual_time_sec.toFixed(1)}s vs ${t_expected.toFixed(1)}s expected ` +
      `(${(ratio * 100).toFixed(0)}%). Possible struggle, distraction, or interruption.`;
  }

  return {
    expected_time_sec: t_expected,
    actual_time_sec,
    ratio,
    flag,
    components: { t_read, t_solve, t_input },
    reason,
  };
}

// ============================================================================
// SESSION-LEVEL AGGREGATION
// ============================================================================

export interface SessionTimeFlags {
  total_items: number;
  /** Items below the absolute floor — accidental taps, not meaningful attempts */
  invalid_items: number;
  /** Items used as denominator for pct_too_fast / pct_too_slow */
  valid_items: number;
  pct_invalid: number;
  /** Computed over valid_items (excludes invalid) */
  pct_too_fast: number;
  /** Computed over valid_items (excludes invalid) */
  pct_too_slow: number;
  session_flag:
    | 'unreliable'    // too many invalid items — session not trustworthy
    | 'rushed'
    | 'struggling'
    | 'mixed'
    | 'normal';
}

export function aggregateSessionFlags(results: FlagResult[]): SessionTimeFlags {
  const total = results.length;
  if (total === 0) {
    return {
      total_items: 0,
      invalid_items: 0,
      valid_items: 0,
      pct_invalid: 0,
      pct_too_fast: 0,
      pct_too_slow: 0,
      session_flag: 'normal',
    };
  }

  const invalid = results.filter((r) => r.flag === 'invalid').length;
  const valid = total - invalid;
  const pct_invalid = invalid / total;

  // If most responses were sub-second taps, the session is unreliable
  // regardless of how the remaining items pattern out.
  const UNRELIABLE = 0.20;
  if (pct_invalid >= UNRELIABLE) {
    return {
      total_items: total,
      invalid_items: invalid,
      valid_items: valid,
      pct_invalid,
      pct_too_fast: 0,
      pct_too_slow: 0,
      session_flag: 'unreliable',
    };
  }

  // Compute rushed/struggling rates over VALID items only, so that a child
  // who tapped through 1 of 20 items and rushed 6 of the remaining 19 gets
  // flagged as rushed (6/19 = 32%), not diluted to 6/20 = 30%.
  const fast = results.filter((r) => r.flag === 'too_fast').length;
  const slow = results.filter((r) => r.flag === 'too_slow').length;
  const pct_too_fast = valid > 0 ? fast / valid : 0;
  const pct_too_slow = valid > 0 ? slow / valid : 0;

  const RUSHED = 0.30;
  const STRUGGLING = 0.25;

  let session_flag: SessionTimeFlags['session_flag'] = 'normal';
  if (pct_too_fast >= RUSHED && pct_too_slow >= STRUGGLING) session_flag = 'mixed';
  else if (pct_too_fast >= RUSHED) session_flag = 'rushed';
  else if (pct_too_slow >= STRUGGLING) session_flag = 'struggling';

  return {
    total_items: total,
    invalid_items: invalid,
    valid_items: valid,
    pct_invalid,
    pct_too_fast,
    pct_too_slow,
    session_flag,
  };
}

