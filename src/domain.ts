import { z } from 'zod';

export const participantIds = ['S01', 'S02', 'S03'] as const;
export const juryIds = ['J1', 'J2'] as const;
export const criteria = ['strategi', 'implementasi', 'hasil'] as const;
export type ParticipantId = typeof participantIds[number];
export type JuryId = typeof juryIds[number];
export type Criterion = typeof criteria[number];
export type Role = 'Admin' | JuryId;
export const labels: Record<Criterion, string> = { strategi: 'Strategi', implementasi: 'Implementasi', hasil: 'Hasil' };

const scoreSchema = z.number().min(0).max(5).nullable();
const scoresSchema = z.object({ strategi: scoreSchema, implementasi: scoreSchema, hasil: scoreSchema });
const assessmentSchema = z.object({ scores: scoresSchema, note: z.string().max(2000) });
export const weightsSchema = z.object({
  strategi: z.number().min(0).max(100),
  implementasi: z.number().min(0).max(100),
  hasil: z.number().min(0).max(100),
}).refine(w => Math.abs(w.strategi + w.implementasi + w.hasil - 100) < 1e-8, 'Total bobot harus 100%.');
const nameSchema = z.string().trim().min(1).max(80);
export const stateSchema = z.object({
  version: z.literal(1),
  participants: z.record(z.enum(participantIds), nameSchema),
  juries: z.record(z.enum(juryIds), nameSchema),
  weights: weightsSchema,
  assessments: z.record(z.enum(participantIds), z.record(z.enum(juryIds), assessmentSchema)),
});
export type State = z.infer<typeof stateSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type Weights = z.infer<typeof weightsSchema>;
export type ScoreInputs = Record<Criterion, string>;
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function emptyAssessment(): Assessment {
  return { scores: { strategi: null, implementasi: null, hasil: null }, note: '' };
}

export function initialState(): State {
  return {
    version: 1,
    participants: { S01: 'Peserta S01', S02: 'Peserta S02', S03: 'Peserta S03' },
    juries: { J1: 'Juri 1', J2: 'Juri 2' },
    weights: { strategi: 40, implementasi: 35, hasil: 25 },
    assessments: {
      S01: { J1: emptyAssessment(), J2: emptyAssessment() },
      S02: { J1: emptyAssessment(), J2: emptyAssessment() },
      S03: { J1: emptyAssessment(), J2: emptyAssessment() },
    },
  };
}

export function exampleState(): State {
  const state = initialState();
  const rows: [ParticipantId, JuryId, number, number, number][] = [
    ['S01', 'J1', 4, 3, 4], ['S01', 'J2', 4, 4, 3],
    ['S02', 'J1', 3, 4, 4], ['S02', 'J2', 4, 3, 4],
    ['S03', 'J1', 5, 4, 3], ['S03', 'J2', 4, 4, 4],
  ];
  for (const [p, j, strategi, implementasi, hasil] of rows) {
    state.assessments[p][j].scores = { strategi, implementasi, hasil };
  }
  return state;
}

export function parseNumber(input: string): number {
  const normalized = input.trim().replace(',', '.');
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
}

export function parseScore(input: string): Result<number | null> {
  if (!input.trim()) return { ok: true, value: null };
  const number = parseNumber(input);
  return Number.isFinite(number) && number >= 0 && number <= 5
    ? { ok: true, value: number }
    : { ok: false, error: 'Masukkan angka dalam rentang 0–5.' };
}

export function parseAssessment(inputs: ScoreInputs, note: string): Result<Assessment> {
  const assessment = emptyAssessment();
  for (const criterion of criteria) {
    const result = parseScore(inputs[criterion]);
    if (!result.ok) return { ok: false, error: `${labels[criterion]}: ${result.error}` };
    assessment.scores[criterion] = result.value;
  }
  if (note.length > 2000) return { ok: false, error: 'Catatan maksimal 2.000 karakter.' };
  assessment.note = note;
  return { ok: true, value: assessment };
}

export function parseWeights(inputs: ScoreInputs): Result<Weights> {
  const result = weightsSchema.safeParse({
    strategi: parseNumber(inputs.strategi),
    implementasi: parseNumber(inputs.implementasi),
    hasil: parseNumber(inputs.hasil),
  });
  return result.success ? { ok: true, value: result.data }
    : { ok: false, error: 'Setiap bobot harus berupa angka 0–100% dan total bobot harus 100%.' };
}

export function scoreInputs(assessment: Assessment): ScoreInputs {
  return {
    strategi: assessment.scores.strategi?.toString() ?? '',
    implementasi: assessment.scores.implementasi?.toString() ?? '',
    hasil: assessment.scores.hasil?.toString() ?? '',
  };
}

export function juryValue(assessment: Assessment, weights: Weights): number | null {
  const { strategi, implementasi, hasil } = assessment.scores;
  if (strategi === null || implementasi === null || hasil === null) return null;
  return strategi / 5 * weights.strategi + implementasi / 5 * weights.implementasi + hasil / 5 * weights.hasil;
}

export function summary(state: State, participant: ParticipantId) {
  const j1 = juryValue(state.assessments[participant].J1, state.weights);
  const j2 = juryValue(state.assessments[participant].J2, state.weights);
  const completed = Number(j1 !== null) + Number(j2 !== null);
  return { j1, j2, completed, final: j1 !== null && j2 !== null ? (j1 + j2) / 2 : null };
}

export function formatValue(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
