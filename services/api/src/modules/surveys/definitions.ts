/**
 * Survey definitions. The PHQ-9 is a public-domain instrument; the wording below
 * is the standard nine-item form with the standard 0–3 response scale. No
 * severity bands are implemented here: the plan deliberately leaves clinical
 * thresholds out until a reviewer signs them off (OD-10). The backend stores an
 * item-level score and, for item 9, a possible-concern flag only.
 */
export interface SurveyItemDefinition {
  key: string;
  prompt: string;
  min: number;
  max: number;
}

export interface SurveyDefinition {
  key: string;
  title: string;
  version: number;
  items: readonly SurveyItemDefinition[];
}

export const PHQ9_ITEMS: readonly SurveyItemDefinition[] = [
  {
    key: 'q1',
    prompt: 'Little interest or pleasure in doing things',
    min: 0,
    max: 3,
  },
  {
    key: 'q2',
    prompt: 'Feeling down, depressed, or hopeless',
    min: 0,
    max: 3,
  },
  {
    key: 'q3',
    prompt: 'Trouble falling or staying asleep, or sleeping too much',
    min: 0,
    max: 3,
  },
  {
    key: 'q4',
    prompt: 'Feeling tired or having little energy',
    min: 0,
    max: 3,
  },
  {
    key: 'q5',
    prompt: 'Poor appetite or overeating',
    min: 0,
    max: 3,
  },
  {
    key: 'q6',
    prompt:
      'Feeling bad about yourself, or that you are a failure or have let yourself or your family down',
    min: 0,
    max: 3,
  },
  {
    key: 'q7',
    prompt: 'Trouble concentrating on things, such as reading the newspaper or watching television',
    min: 0,
    max: 3,
  },
  {
    key: 'q8',
    prompt:
      'Moving or speaking so slowly that other people could have noticed, or the opposite: being so fidgety or restless that you have been moving around a lot more than usual',
    min: 0,
    max: 3,
  },
  {
    key: 'q9',
    prompt: 'Thoughts that you would be better off dead or of hurting yourself in some way',
    min: 0,
    max: 3,
  },
];

export const PHQ9_SURVEY: SurveyDefinition = {
  key: 'phq9',
  title: 'Patient Health Questionnaire-9',
  version: 1,
  items: PHQ9_ITEMS,
};

export const SURVEY_DEFINITIONS: readonly SurveyDefinition[] = [PHQ9_SURVEY];

export const PHQ9_KEY = PHQ9_SURVEY.key;
export const PHQ9_ITEM9_KEY = 'q9';

/**
 * Survey items are stored as JSONB. A malformed definition means the server's
 * own data is corrupt, so fail loudly (500) instead of accepting answers that
 * cannot be scored against a real instrument.
 */
export function parseSurveyItems(value: unknown): SurveyItemDefinition[] {
  if (!Array.isArray(value)) {
    throw new Error('Survey items must be an array');
  }
  return value.map((raw, index) => {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Survey item ${index} is not an object`);
    }
    const item = raw as Record<string, unknown>;
    if (
      typeof item.key !== 'string' ||
      item.key.length === 0 ||
      typeof item.prompt !== 'string' ||
      item.prompt.length === 0 ||
      typeof item.min !== 'number' ||
      !Number.isInteger(item.min) ||
      typeof item.max !== 'number' ||
      !Number.isInteger(item.max) ||
      item.min > item.max
    ) {
      throw new Error(`Survey item ${index} is malformed`);
    }
    return {
      key: item.key,
      prompt: item.prompt,
      min: item.min,
      max: item.max,
    };
  });
}
