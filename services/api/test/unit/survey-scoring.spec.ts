import {
  PHQ9_ITEMS,
  PHQ9_ITEM9_KEY,
  PHQ9_KEY,
  parseSurveyItems,
} from '../../src/modules/surveys/definitions';
import {
  RETAKE_COOLDOWN_DAYS,
  SurveyResponseError,
  retakeAllowed,
  retakeAvailableAt,
  scoreSurvey,
  validateResponses,
} from '../../src/modules/surveys/scoring';

const zeros = (): Record<string, number> =>
  Object.fromEntries(PHQ9_ITEMS.map((item) => [item.key, 0]));

describe('PHQ-9 definition', () => {
  it('has the nine standard items on a 0-3 scale', () => {
    expect(PHQ9_ITEMS).toHaveLength(9);
    expect(PHQ9_ITEMS.map((item) => item.key)).toEqual([
      'q1',
      'q2',
      'q3',
      'q4',
      'q5',
      'q6',
      'q7',
      'q8',
      'q9',
    ]);
    for (const item of PHQ9_ITEMS) {
      expect(item.min).toBe(0);
      expect(item.max).toBe(3);
      expect(item.prompt.length).toBeGreaterThan(0);
    }
  });

  it('parses the stored JSON shape and rejects a malformed definition', () => {
    expect(parseSurveyItems(PHQ9_ITEMS.map((item) => ({ ...item })))).toHaveLength(9);
    expect(() => parseSurveyItems({ not: 'an array' })).toThrow();
    expect(() => parseSurveyItems([{ key: 'q1' }])).toThrow();
  });
});

describe('survey scoring (REQ-SURV-01, OD-10)', () => {
  it('sums item scores server-side', () => {
    const responses = { ...zeros(), q1: 3, q2: 2, q3: 1 };
    const outcome = scoreSurvey(PHQ9_KEY, PHQ9_ITEMS, responses);
    expect(outcome.totalScore).toBe(6);
    expect(outcome.scores).toEqual(responses);
  });

  it('accepts the maximum total of 27', () => {
    const responses = Object.fromEntries(PHQ9_ITEMS.map((item) => [item.key, 3]));
    expect(scoreSurvey(PHQ9_KEY, PHQ9_ITEMS, responses).totalScore).toBe(27);
  });

  it('raises possible concern for any non-zero item 9, and nothing else', () => {
    const zero = scoreSurvey(PHQ9_KEY, PHQ9_ITEMS, zeros());
    expect(zero.possibleConcern).toBe(false);
    expect(zero.phq9Item9).toBe(0);

    const positive = scoreSurvey(PHQ9_KEY, PHQ9_ITEMS, { ...zeros(), [PHQ9_ITEM9_KEY]: 1 });
    expect(positive.possibleConcern).toBe(true);
    expect(positive.phq9Item9).toBe(1);
  });

  it('never raises possible concern for a different instrument', () => {
    const outcome = scoreSurvey('gad7', PHQ9_ITEMS, { ...zeros(), [PHQ9_ITEM9_KEY]: 3 });
    expect(outcome.possibleConcern).toBe(false);
    expect(outcome.phq9Item9).toBeNull();
  });

  it.each([
    [
      'a missing answer',
      (() => {
        const responses = zeros();
        delete responses.q4;
        return responses;
      })(),
    ],
    ['an out-of-range answer', { ...zeros(), q1: 4 }],
    ['a negative answer', { ...zeros(), q2: -1 }],
    ['a non-integer answer', { ...zeros(), q3: 1.5 }],
    ['an unknown key', { ...zeros(), q10: 1 }],
  ])('rejects %s', (_label, responses) => {
    expect(() => validateResponses(PHQ9_ITEMS, responses)).toThrow(SurveyResponseError);
  });

  it('rejects a non-object answer set', () => {
    expect(() => validateResponses(PHQ9_ITEMS, [])).toThrow(SurveyResponseError);
    expect(() => validateResponses(PHQ9_ITEMS, null)).toThrow(SurveyResponseError);
  });
});

describe('REQ-SURV-03: 14-day retake cooldown', () => {
  const completed = new Date('2026-03-01T12:00:00.000Z');
  const dayMs = 24 * 60 * 60 * 1000;

  it('allows a first retake when there is no earlier result', () => {
    expect(retakeAllowed(null, completed)).toBe(true);
    expect(retakeAvailableAt(null)).toBeNull();
  });

  it('rejects a retake one millisecond before the cooldown ends', () => {
    const justBefore = new Date(completed.getTime() + RETAKE_COOLDOWN_DAYS * dayMs - 1);
    expect(retakeAllowed(completed, justBefore)).toBe(false);
  });

  it('allows a retake exactly at the cooldown boundary', () => {
    const boundary = new Date(completed.getTime() + RETAKE_COOLDOWN_DAYS * dayMs);
    expect(retakeAllowed(completed, boundary)).toBe(true);
    expect(retakeAvailableAt(completed)).toEqual(boundary);
  });
});
