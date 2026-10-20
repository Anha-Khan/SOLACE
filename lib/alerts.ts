import type { AppState, DemoAlert } from "./types";

export function alertMinutes(alert: DemoAlert, now = Date.now()) {
  if (typeof alert.demoMinutes === "number") return alert.demoMinutes;
  return Math.max(0, Math.floor((now - new Date(alert.createdAt).getTime()) / 60000));
}

export function alertPhase(minutes: number): "none" | "remind" | "emergency" | "organisation" {
  if (minutes >= 360) return "organisation";
  if (minutes >= 120) return "emergency";
  if (minutes >= 30) return "remind";
  return "none";
}

export function selfOpenAlert(state: AppState) {
  return (
    state.alerts.find(
      (alert) => alert.patientId === "self" && alert.state !== "resolved" && alert.state !== "closed",
    ) ?? null
  );
}

export function waitingAlerts(state: AppState, now = Date.now()) {
  return state.alerts.filter(
    (alert) => alert.state !== "resolved" && alert.state !== "closed" && alertMinutes(alert, now) >= 120,
  );
}
