const NOTIFICATION_LIMIT = 20;
function notificationStorageKey() {
  return `attendance-notifications:${state.currentUser?.id || "guest"}`;
}
function shiftStatusSnapshotKey() {
  return `attendance-shift-statuses:${state.currentUser?.id || "guest"}`;
}
function loadNotifications() {
  try {
    const raw = window.localStorage.getItem(notificationStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    state.notifications = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("通知の読み込みに失敗しました:", error);
    state.notifications = [];
  }
}
function saveNotifications() {
  try {
    window.localStorage.setItem(notificationStorageKey(), JSON.stringify(state.notifications));
  } catch (error) {
    console.error("通知の保存に失敗しました:", error);
  }
}
function notificationTimeLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo"
  }).format(new Date());
}
function pushNotification(message) {
  const entry = {
    id: `${Date.now()}-${state.notifications.length}`,
    message,
    time: notificationTimeLabel()
  };
  state.notifications = [entry, ...state.notifications].slice(0, NOTIFICATION_LIMIT);
  saveNotifications();
  setToast(message);
}
function readShiftStatusSnapshot() {
  try {
    const raw = window.localStorage.getItem(shiftStatusSnapshotKey());
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("シフト状態の読み込みに失敗しました:", error);
    return null;
  }
}
function saveShiftStatusSnapshot(rows) {
  const snapshot = rows.reduce((acc, row) => ({ ...acc, [row.id]: row.status }), {});
  try {
    window.localStorage.setItem(shiftStatusSnapshotKey(), JSON.stringify(snapshot));
  } catch (error) {
    console.error("シフト状態の保存に失敗しました:", error);
  }
}
function notifyShiftStatusChanges(rows) {
  const userId = state.currentUser?.id;
  if (!userId) return;
  const ownRows = rows.filter((row) => row.user_id === userId);
  const snapshot = readShiftStatusSnapshot();
  if (snapshot) {
    ownRows
      .filter((row) => {
        const previous = snapshot[row.id];
        return previous && previous !== "rejected" && row.status === "rejected";
      })
      .forEach((row) => {
        pushNotification(`シフト申請（希望日 ${toDisplayDate(row.request_date)}）が却下されました。`);
      });
  }
  saveShiftStatusSnapshot(ownRows);
}
function renderNotificationItems() {
  if (!state.notifications.length) return "";
  return state.notifications.map((item) => `
    <div class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(item.message)}</div>
          <div class="item-meta">${escapeHtml(item.time)}</div>
        </div>
      </div>
    </div>
  `).join("");
}
