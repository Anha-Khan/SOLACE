export type Stage = 'stage1' | 'stage2' | 'stage3';

export interface StageSignals {
  moodStableOrImproving7d: boolean;
  taskCompletionAbove60Over7d: boolean;
  noCrisisLanguageThisWeek: boolean;
  therapistConnected: boolean;
  therapistApproved: boolean;
  approvalHoldElapsed: boolean;
}

export function canAdvanceStage(s: StageSignals, current: Stage): boolean {
  if (current === 'stage3') return false;
  if (!s.moodStableOrImproving7d) return false;
  if (!s.taskCompletionAbove60Over7d) return false;
  if (!s.noCrisisLanguageThisWeek) return false;
  if (s.therapistConnected) {
    return s.therapistApproved && s.approvalHoldElapsed;
  }
  return true;
}

export function stage2TasksUnlocked(stage: Stage, therapistConnected: boolean): boolean {
  if (stage !== 'stage2' && stage !== 'stage3') return false;
  return therapistConnected;
}
