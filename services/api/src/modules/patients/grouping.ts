export type PriorityGroup =
  'needs_attention' | 'check_in_when_you_can' | 'progressing_well' | 'no_recent_activity';

export interface PatientSignals {
  hasOpenCrisisAlert: boolean;
  tier2Or3InLast72h: boolean;
  possibleConcernUnreviewed: boolean;
  threeConsecutiveLowMoodDays: boolean;
  threeSkippedTasksIn7Days: boolean;
  checkedInLast3Days: boolean;
  noCheckIn3Days: boolean;
}

export function groupPatient(s: PatientSignals): PriorityGroup {
  if (s.hasOpenCrisisAlert || s.tier2Or3InLast72h || s.possibleConcernUnreviewed) {
    return 'needs_attention';
  }
  if (s.threeConsecutiveLowMoodDays || s.threeSkippedTasksIn7Days) {
    return 'check_in_when_you_can';
  }
  if (s.noCheckIn3Days) {
    return 'no_recent_activity';
  }
  if (s.checkedInLast3Days) {
    return 'progressing_well';
  }
  return 'no_recent_activity';
}
