const STORAGE_PREFIX = "ishop-notifications-dismissed";

export type NotificationKind = "lowStock" | "overdue";

interface DismissedState {
  lowStock?: string;
  overdue?: string;
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readState(userId: string): DismissedState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as DismissedState) : {};
  } catch {
    return {};
  }
}

function writeState(userId: string, state: DismissedState) {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

export function lowStockFingerprint(count: number) {
  return String(count);
}

export function overdueFingerprint(count: number, reservationIds: string[]) {
  return `${count}:${[...reservationIds].sort().join(",")}`;
}

export function loadNotificationDismissals(userId: string): DismissedState {
  return readState(userId);
}

export function isNotificationDismissed(
  userId: string,
  kind: NotificationKind,
  fingerprint: string,
): boolean {
  const state = readState(userId);
  return state[kind === "lowStock" ? "lowStock" : "overdue"] === fingerprint;
}

export function dismissNotification(
  userId: string,
  kind: NotificationKind,
  fingerprint: string,
): DismissedState {
  const state = readState(userId);
  const next =
    kind === "lowStock"
      ? { ...state, lowStock: fingerprint }
      : { ...state, overdue: fingerprint };
  writeState(userId, next);
  return next;
}

export function dismissAllNotifications(
  userId: string,
  fingerprints: Partial<Record<NotificationKind, string>>,
): DismissedState {
  const state = readState(userId);
  const next: DismissedState = { ...state };
  if (fingerprints.lowStock) next.lowStock = fingerprints.lowStock;
  if (fingerprints.overdue) next.overdue = fingerprints.overdue;
  writeState(userId, next);
  return next;
}
