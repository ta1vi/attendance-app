const icons = {
  dashboard: '<svg viewBox="0 0 24 24"><path d="M3 13h8V3H3z"/><path d="M13 21h8V11h-8z"/><path d="M13 3h8v6h-8z"/><path d="M3 21h8v-6H3z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l4 2"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>',
  approvals: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  departments: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  report: '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 3.8l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.38.52.7.9.9.33.17.7.25 1.07.25H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  logOut: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>'
};
const navItems = [
  { path: "/dashboard", label: "ダッシュボード", icon: "dashboard", roles: ["admin", "member"] },
  { path: "/attendance", label: "打刻", icon: "clock", roles: ["admin", "member"] },
  { path: "/shift-request", label: "シフト申請", icon: "calendar", roles: ["admin", "member"] },
  { path: "/leave-request", label: "休暇申請", icon: "departments", roles: ["admin", "member"] },
  { path: "/clock-correction", label: "打刻修正", icon: "history", roles: ["admin", "member"] },
  { path: "/overtime-request", label: "残業申請", icon: "clock", roles: ["admin", "member"] },
  { path: "/calendar", label: "カレンダー", icon: "calendar", roles: ["admin", "member"] },
  { path: "/daily-report", label: "日報", icon: "approvals", roles: ["admin", "member"] },
  { path: "/monthly-report", label: "月次レポート", icon: "report", roles: ["admin", "member"] },
  { section: "admin" },
  { path: "/admin/approvals", label: "承認管理", icon: "approvals", roles: ["admin"] },
  { path: "/admin/member-attendance", label: "メンバー勤怠", icon: "calendar", roles: ["admin"] },
  { path: "/admin/monthly-close", label: "月次締め", icon: "settings", roles: ["admin"] },
  { path: "/admin/employee-master", label: "従業員マスタ", icon: "users", roles: ["admin"] }
];
const pageMeta = {
  "/dashboard": ["ダッシュボード", "今日の打刻状況と管理サマリ"],
  "/attendance": ["打刻", "出勤、退勤、休憩の記録"],
  "/shift-request": ["シフト申請", "希望シフトと勤務時間帯の申請"],
  "/leave-request": ["休暇申請", "有給休暇や特別休暇の申請"],
  "/clock-correction": ["打刻修正", "打刻漏れや時刻誤りの修正申請"],
  "/clock-correction/edit": ["打刻修正", "対象日の勤怠を理由付きで申請"],
  "/overtime-request": ["残業申請", "予定残業と理由の申請"],
  "/calendar": ["カレンダー", "シフト、休暇、締め日を月表示で確認"],
  "/daily-report": ["日報", "本日の業務内容と明日の予定"],
  "/monthly-report": ["月次レポート", "個人の勤務時間と申請状況の集計"],
  "/admin/approvals": ["承認管理", "申請の承認と却下"],
  "/admin/member-attendance": ["メンバー勤怠", "メンバー別の出退勤状況"],
  "/admin/monthly-close": ["月次締め", "月末の勤怠確定と差戻し"],
  "/admin/employee-master": ["従業員マスタ", "従業員情報と所属の管理"]
};
const statusLabels = {
  not_started: "未出勤",
  working: "勤務中",
  break: "休憩中",
  done: "退勤済",
  normal: "正常",
  missing_clock_out: "退勤漏れ",
  correction_pending: "修正申請中",
  correction_approved: "承認済み",
  correction_rejected: "却下",
  shift_pending: "申請中",
  shift_approved: "承認済み",
  shift_rejected: "却下",
  absent: "欠勤",
  paid_leave: "有給",
  holiday: "休日"
};
const statusClasses = {
  normal: "ok",
  working: "ok",
  done: "neutral",
  break: "warn",
  not_started: "neutral",
  missing_clock_out: "warn",
  correction_pending: "info",
  correction_approved: "ok",
  correction_rejected: "danger",
  shift_pending: "info",
  shift_approved: "ok",
  shift_rejected: "danger",
  absent: "danger",
  paid_leave: "info",
  holiday: "neutral"
};
const attendanceTypes = ["出社", "リモート", "直行", "直帰", "フレックス"];
const state = {
  role: "admin",
  path: "/dashboard",
  sidebarOpen: false,
  attendance: {
    status: "not_started",
    workType: "出社",
    clockIn: "",
    clockOut: "",
    breakCount: 0,
    breakMinutes: 0,
    logs: []
  },
  punchHistory: [
    { id: 1, date: "2026/07/06", time: "18:24:00", action: "退勤", workType: "出社", status: "done" },
    { id: 2, date: "2026/07/06", time: "13:00:00", action: "休憩終了", workType: "出社", status: "working" },
    { id: 3, date: "2026/07/06", time: "12:00:00", action: "休憩開始", workType: "出社", status: "break" },
    { id: 4, date: "2026/07/06", time: "09:11:00", action: "出勤", workType: "出社", status: "working" }
  ],
  history: [
    { id: "2026-07-07", date: "2026/07/07", clockIn: "-", clockOut: "", work: "-", overtime: "-", status: "not_started" },
    { id: "2026-07-06", date: "2026/07/06", clockIn: "09:11", clockOut: "18:24", work: "8:13", overtime: "0:13", status: "normal" },
    { id: "2026-07-05", date: "2026/07/05", clockIn: "09:00", clockOut: "", work: "-", overtime: "-", status: "missing_clock_out" },
    { id: "2026-07-04", date: "2026/07/04", clockIn: "-", clockOut: "-", work: "-", overtime: "-", status: "paid_leave" },
    { id: "2026-07-03", date: "2026/07/03", clockIn: "08:58", clockOut: "18:06", work: "8:08", overtime: "0:08", status: "correction_approved" }
  ],
  approvals: [
    { id: 1, employee: "田中 花子", department: "営業部", date: "2026/07/05", requested: "退勤 18:12 を追加", reason: "外出先から直帰し、退勤打刻を忘れたため", status: "pending" },
    { id: 2, employee: "佐藤 健", department: "開発部", date: "2026/07/04", requested: "出勤 09:30 に変更", reason: "電車遅延の記録反映", status: "pending" },
    { id: 3, employee: "鈴木 美咲", department: "管理部", date: "2026/07/03", requested: "休憩 60分を追加", reason: "休憩終了のみ打刻したため", status: "approved" }
  ],
  shiftRequests: [
    { id: 1, requestDate: "2026/07/10", shift: "早番", time: "08:00 - 17:00", reason: "午前の顧客訪問に合わせて勤務開始を前倒し", submittedAt: "2026/07/01", status: "shift_approved" },
    { id: 2, requestDate: "2026/07/15", shift: "遅番", time: "11:00 - 20:00", reason: "夕方の問い合わせ対応当番", submittedAt: "2026/07/05", status: "shift_pending" },
    { id: 3, requestDate: "2026/07/18", shift: "休暇", time: "-", reason: "私用のため", submittedAt: "2026/07/04", status: "shift_rejected" }
  ],
  leaveSummary: {
    annualGranted: 20,
    carriedOver: 2,
    used: 7.5
  },
  leaveRequests: [
    { id: 1, requestDate: "2026/07/04", type: "有給休暇", days: 1, reason: "私用のため", submittedAt: "2026/06/28", status: "shift_approved" },
    { id: 2, requestDate: "2026/07/25", type: "午前休", days: 0.5, reason: "通院のため", submittedAt: "2026/07/05", status: "shift_pending" },
    { id: 3, requestDate: "2026/06/18", type: "午後休", days: 0.5, reason: "家族都合のため", submittedAt: "2026/06/10", status: "shift_approved" }
  ],
  overtimeRequests: [
    { id: 1, requestDate: "2026/07/08", endTime: "20:00", hours: "2:00", reason: "月次資料作成", submittedAt: "2026/07/06", status: "shift_pending" },
    { id: 2, requestDate: "2026/07/02", endTime: "19:00", hours: "1:00", reason: "顧客対応", submittedAt: "2026/07/01", status: "shift_approved" }
  ],
  dailyReports: [
    { id: 1, date: "2026/07/06", title: "既存顧客フォロー", body: "A社の契約更新に向けて利用状況を整理し、次回提案の論点をまとめました。", next: "見積条件を確認して提案資料を更新する" },
    { id: 2, date: "2026/07/03", title: "問い合わせ対応", body: "新規問い合わせ 5 件に対応し、うち 2 件を商談化しました。", next: "商談日程の確定と事前ヒアリング" }
  ],
  reportEditingId: null,
  employees: [
    { name: "田中 花子", department: "営業部", role: "member", status: "勤務中", today: "09:05 -", month: "126:40" },
    { name: "佐藤 健", department: "開発部", role: "member", status: "未出勤", today: "-", month: "118:20" },
    { name: "鈴木 美咲", department: "管理部", role: "admin", status: "退勤済", today: "08:56 - 17:48", month: "132:05" },
    { name: "高橋 翔", department: "営業部", role: "member", status: "休憩中", today: "09:12 -", month: "121:10" },
    { name: "伊藤 葵", department: "開発部", role: "member", status: "勤務中", today: "10:00 -", month: "116:45" }
  ],
  employeeFilter: "",
  departmentFilter: "all",
  toast: ""
};
