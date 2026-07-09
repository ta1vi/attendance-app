const app = document.querySelector("#app");
const TOKYO_TIME_ZONE = "Asia/Tokyo";
const BASE_WORK_MINUTES = 8 * 60;

function icon(name) {
  return `<span class="icon" aria-hidden="true">${icons[name] || ""}</span>`;
}
function badge(status, label = statusLabels[status]) {
  const className = statusClasses[status] || "neutral";
  return `<span class="badge ${className}">${label}</span>`;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
function currentPath() {
  const hash = window.location.hash.replace("#", "");
  if (hash) return hash;
  return window.location.pathname.replace(/\/$/, "") === "/login" ? "/login" : "/dashboard";
}
function normalizePath(path) {
  if (path === "/login") return "/login";
  if (path.startsWith("/clock-correction/edit") || path.startsWith("/history/edit")) return "/clock-correction/edit";
  return pageMeta[path] ? path : "/dashboard";
}
function canAccessPath(path) {
  return state.role === "admin" || !path.startsWith("/admin");
}
function demoUserForRole(role) {
  return role === "admin"
    ? { name: "鈴木 美咲", email: "admin@example.com", department: "管理部", role }
    : { name: "田中 花子", email: "member@example.com", department: "営業部", role };
}
function userFromProfile(profile) {
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    department: profile.department || "",
    role: profile.role === "admin" ? "admin" : "member"
  };
}
function applyAuthProfile(profile) {
  const user = userFromProfile(profile);
  state.role = user.role;
  state.loginRole = user.role;
  state.currentUser = user;
  state.isLoggedIn = true;
  state.authError = "";
  if (!state.employees.some((employee) => employee.name === user.name)) {
    state.employees = [
      { name: user.name, department: user.department || "-", role: user.role, status: "未出勤", today: "-", month: "0:00" },
      ...state.employees
    ];
  }
}
function clearAuthState() {
  state.isLoggedIn = false;
  state.sidebarOpen = false;
  state.authMode = "login";
  state.role = "member";
  state.loginRole = "member";
  state.currentUser = null;
}
function setAuthPending(pending) {
  state.authPending = pending;
}
function todayLabel(value = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "full",
    timeZone: TOKYO_TIME_ZONE
  }).format(new Date(value));
}
function utcToJapanTime(value, options = {}) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    ...(options.seconds === false ? {} : { second: "2-digit" }),
    hourCycle: "h23",
    timeZone: TOKYO_TIME_ZONE
  }).format(date);
}
function nowTime(value = new Date()) {
  return utcToJapanTime(value);
}
function currentIsoDate(value = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TOKYO_TIME_ZONE
  }).format(new Date(value)).replace(/\//g, "-");
}
function toDisplayDate(isoDate) {
  return isoDate ? isoDate.replace(/-/g, "/") : "";
}
function toMinuteTime(time) {
  return time && time !== "-" ? time.slice(0, 5) : "";
}
function formatMinutes(minutes) {
  const safeMinutes = Math.max(Math.round(minutes), 0);
  return `${Math.floor(safeMinutes / 60)}:${String(safeMinutes % 60).padStart(2, "0")}`;
}
function nextNumericId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}
function isAttendanceDay(row) {
  return row && row.clockIn && row.clockIn !== "-" && row.status !== "paid_leave" && row.status !== "holiday";
}
function calendarCells(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: dayCount }, (_, index) => index + 1));
  while (cells.length % 7) cells.push(null);
  return cells;
}
function normalizeBreaks(breaks) {
  if (Array.isArray(breaks)) return breaks;
  if (typeof breaks === "string") {
    try {
      const parsed = JSON.parse(breaks);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}
function totalBreakMinutes(breaks) {
  return normalizeBreaks(breaks).reduce((total, item) => {
    if (!item.start || !item.end) return total;
    const minutes = (new Date(item.end).getTime() - new Date(item.start).getTime()) / 60000;
    return total + Math.max(minutes, 0);
  }, 0);
}
function recordBreakMinutes(record) {
  return Math.round(Number(record?.break_minutes) || totalBreakMinutes(record?.breaks));
}
function attendanceStatus(record) {
  if (!record?.clock_in) return "not_started";
  if (record.clock_out) return "done";
  return record.status === "break" ? "break" : "working";
}
function buildAttendanceLogs(record) {
  const logs = [];
  if (record?.clock_in) {
    logs.push({
      at: record.clock_in,
      time: utcToJapanTime(record.clock_in),
      label: `出勤打刻（${record.work_type || "出社"}）`
    });
  }
  normalizeBreaks(record?.breaks).forEach((item) => {
    if (item.start) {
      logs.push({ at: item.start, time: utcToJapanTime(item.start), label: "休憩開始" });
    }
    if (item.end) {
      logs.push({ at: item.end, time: utcToJapanTime(item.end), label: "休憩終了" });
    }
  });
  if (record?.clock_out) {
    logs.push({ at: record.clock_out, time: utcToJapanTime(record.clock_out), label: "退勤打刻" });
  }
  return logs
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map(({ time, label }) => ({ time, label }));
}
function attendanceSummary(record) {
  if (!record?.clock_in) return { work: "-", overtime: "-" };
  if (!record.clock_out) return { work: "進行中", overtime: "-" };
  const worked = (new Date(record.clock_out).getTime() - new Date(record.clock_in).getTime()) / 60000 - recordBreakMinutes(record);
  return {
    work: formatMinutes(worked),
    overtime: formatMinutes(Math.max(worked - BASE_WORK_MINUTES, 0))
  };
}
function syncTodayHistory(record) {
  const workDate = record?.work_date || currentIsoDate();
  const summary = attendanceSummary(record);
  const row = {
    id: workDate,
    date: toDisplayDate(workDate),
    clockIn: record?.clock_in ? utcToJapanTime(record.clock_in, { seconds: false }) : "-",
    clockOut: record?.clock_out ? utcToJapanTime(record.clock_out, { seconds: false }) : "",
    work: summary.work,
    overtime: summary.overtime,
    status: record?.clock_out ? "normal" : attendanceStatus(record),
    workType: record?.work_type || state.attendance.workType
  };
  state.history = [row, ...state.history.filter((item) => item.id !== workDate)];
}
function updateCurrentEmployeeSummary() {
  if (!state.currentUser?.name) return;
  const clockIn = toMinuteTime(state.attendance.clockIn);
  const clockOut = toMinuteTime(state.attendance.clockOut);
  const today = clockIn ? `${clockIn} - ${clockOut}` : "-";
  const status = statusLabels[state.attendance.status] || "未出勤";
  state.employees = state.employees.map((employee) => {
    if (employee.name !== state.currentUser.name) return employee;
    return { ...employee, status, today };
  });
}
function resetTodayAttendance() {
  state.attendance = {
    ...state.attendance,
    id: null,
    workDate: currentIsoDate(),
    status: "not_started",
    clockIn: "",
    clockOut: "",
    breakCount: 0,
    breakMinutes: 0,
    breaks: [],
    logs: []
  };
  syncTodayHistory(null);
  updateCurrentEmployeeSummary();
}
function applyAttendanceRecord(record) {
  if (!record) {
    resetTodayAttendance();
    return;
  }
  const breaks = normalizeBreaks(record.breaks);
  state.attendance = {
    ...state.attendance,
    id: record.id,
    workDate: record.work_date,
    status: attendanceStatus(record),
    workType: record.work_type || state.attendance.workType || "出社",
    clockIn: record.clock_in ? utcToJapanTime(record.clock_in) : "",
    clockOut: record.clock_out ? utcToJapanTime(record.clock_out) : "",
    breakCount: breaks.length,
    breakMinutes: recordBreakMinutes(record),
    breaks,
    logs: buildAttendanceLogs(record)
  };
  syncTodayHistory(record);
  updateCurrentEmployeeSummary();
}
async function loadTodayAttendance() {
  if (!state.currentUser?.id || !window.supabaseAuth?.getAttendanceByDate) {
    resetTodayAttendance();
    return null;
  }
  const record = await window.supabaseAuth.getAttendanceByDate(state.currentUser.id, currentIsoDate());
  applyAttendanceRecord(record);
  return record;
}
async function loadTodayAttendanceSafely() {
  try {
    return await loadTodayAttendance();
  } catch (error) {
    console.error(error);
    state.toast = "本日の勤怠情報を取得できませんでした。";
    return null;
  }
}
function setPath(path) {
  if (path === "/login") {
    if (window.location.pathname.replace(/\/$/, "") === "/login") {
      window.location.hash = "";
      return;
    }
    window.location.href = "/login/";
    return;
  }
  if (window.location.pathname.replace(/\/$/, "") === "/login") {
    window.location.href = `/#${path}`;
    return;
  }
  window.location.hash = path;
}
function setToast(message) {
  state.toast = message;
  render();
  window.setTimeout(() => {
    if (state.toast === message) {
      state.toast = "";
      render();
    }
  }, 1800);
}
function render() {
  state.path = normalizePath(currentPath());
  if (!state.authReady) {
    app.innerHTML = renderAuthLoading();
    return;
  }
  if (!state.isLoggedIn) {
    if (state.path !== "/login") setPath("/login");
    app.innerHTML = renderLogin();
    return;
  }
  if (state.path === "/login") {
    setPath("/dashboard");
    return;
  }
  if (!canAccessPath(state.path)) {
    state.path = "/dashboard";
    window.location.hash = "/dashboard";
  }
  const meta = pageMeta[state.path] || pageMeta["/dashboard"];
  app.innerHTML = `
    <div class="shell ${state.sidebarOpen ? "sidebar-open" : ""}">
      <aside class="sidebar">
        ${renderBrand()}
        ${renderNav()}
        ${renderAccount()}
      </aside>
      <div class="drawer-backdrop" data-action="close-sidebar"></div>
      <main class="main">
        ${renderTopbar(meta)}
        <div class="content">
          ${state.toast ? `<div class="notice" style="margin-bottom:16px">${state.toast}</div>` : ""}
          ${renderPage()}
        </div>
      </main>
      ${renderBottomNav()}
    </div>
  `;
}
function renderAuthLoading() {
  return `
    <main class="login-shell">
      <section class="login-panel">
        <div class="brand login-brand">
          <div class="brand-mark">${icon("clock")}</div>
          <div>
            <strong>勤怠管理</strong>
            <span>Attendance App</span>
          </div>
        </div>
        <div class="login-copy">
          <h1>認証確認中</h1>
          <p>Supabaseのセッションを確認しています。</p>
        </div>
      </section>
    </main>
  `;
}
function renderLogin() {
  const isSignup = state.authMode === "signup";
  const initMessage = window.supabaseAuth?.initErrorMessage?.() || "supabase-config.js に anon key を設定してください。";
  const configNotice = !window.supabaseAuth?.isConfigured()
    ? `<div class="notice">${escapeHtml(initMessage)}</div>`
    : "";
  const submitLabel = state.authPending
    ? isSignup ? "登録中" : "ログイン中"
    : isSignup ? "新規登録" : "ログイン";
  return `
    <main class="login-shell">
      <section class="login-panel">
        <div class="brand login-brand">
          <div class="brand-mark">${icon("clock")}</div>
          <div>
            <strong>勤怠管理</strong>
            <span>Attendance App</span>
          </div>
        </div>
        <div class="login-copy">
          <h1>${isSignup ? "サインアップ" : "ログイン"}</h1>
          <p>${isSignup ? "メールアドレスとパスワードでアカウントを作成します。" : "登録済みのメールアドレスとパスワードでログインします。"}</p>
        </div>
        <form class="auth-form" data-auth-form="${isSignup ? "signup" : "login"}">
          <div class="form-field">
            <label for="${isSignup ? "signup-email" : "login-email"}">メールアドレス</label>
            <input class="input" id="${isSignup ? "signup-email" : "login-email"}" type="email" autocomplete="email" placeholder="name@example.com" required />
          </div>
          <div class="form-field">
            <label for="${isSignup ? "signup-password" : "login-password"}">パスワード</label>
            <input class="input" id="${isSignup ? "signup-password" : "login-password"}" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" minlength="6" required />
          </div>
          <button class="button primary login-button" type="submit" ${state.authPending ? "disabled" : ""}>${icon("check")}${submitLabel}</button>
        </form>
        <button class="button neutral login-button" type="button" data-auth-mode="${isSignup ? "login" : "signup"}" ${state.authPending ? "disabled" : ""}>
          ${isSignup ? "ログインに戻る" : "新規アカウントを作成"}
        </button>
        ${configNotice}
        ${state.authError ? `<div class="notice">${escapeHtml(state.authError)}</div>` : ""}
        ${state.toast ? `<div class="notice">${state.toast}</div>` : ""}
      </section>
    </main>
  `;
}
function renderBrand() {
  return `
    <div class="brand">
      <div class="brand-mark">${icon("clock")}</div>
      <div>
        <strong>勤怠管理</strong>
        <span>Attendance App</span>
      </div>
    </div>
  `;
}
function renderNav() {
  let adminSectionOpen = false;
  const items = navItems.map((item) => {
    if (item.section) {
      adminSectionOpen = true;
      return state.role === "admin" ? '<div class="nav-section"></div>' : "";
    }
    if (item.roles.includes("admin") && item.roles.length === 1 && state.role !== "admin") return "";
    const active = state.path === item.path || (item.path === "/clock-correction" && state.path === "/clock-correction/edit");
    const sectionClass = adminSectionOpen && item.roles.length === 1 ? "" : "";
    return `
      <button class="nav-button ${active ? "active" : ""} ${sectionClass}" data-nav="${item.path}">
        ${icon(item.icon)}
        <span>${item.label}</span>
      </button>
    `;
  }).join("");
  return `<nav class="nav">${items}</nav>`;
}
function renderBottomNav() {
  const items = navItems.map((item) => {
    if (item.section) return "";
    if (item.roles.includes("admin") && item.roles.length === 1 && state.role !== "admin") return "";
    const active = state.path === item.path || (item.path === "/clock-correction" && state.path === "/clock-correction/edit");
    return `
      <button class="bottom-nav-button ${active ? "active" : ""}" data-nav="${item.path}">
        ${icon(item.icon)}
        <span>${item.label}</span>
      </button>
    `;
  }).join("");
  return `<nav class="bottom-nav" aria-label="画面下部ナビゲーション">${items}</nav>`;
}
function renderAccount() {
  const user = state.currentUser || demoUserForRole(state.role);
  const name = user.name;
  const roleText = state.role === "admin" ? "管理者" : "一般社員";
  return `
    <div class="account">
      <div class="account-card">
        <div class="avatar">${name.slice(0, 1)}</div>
        <div>
          <div class="account-name">${name}</div>
          <div class="account-role">${roleText}</div>
        </div>
        <button class="icon-button" title="ログアウト" data-action="logout">${icon("logOut")}</button>
      </div>
    </div>
  `;
}
function renderTopbar(meta) {
  return `
    <header class="topbar">
      <button class="icon-button menu-button" title="メニュー" data-action="open-sidebar">${icon("menu")}</button>
      <div class="page-title">
        <h1>${meta[0]}</h1>
        <p>${meta[1]}</p>
      </div>
      <div class="top-actions">
        <div class="role-pill">${state.role === "admin" ? "管理者" : "社員"}</div>
      </div>
    </header>
  `;
}
function renderPage() {
  if (state.path === "/dashboard") return renderDashboard();
  if (state.path === "/attendance") return renderAttendance();
  if (state.path === "/shift-request") return renderShiftRequest();
  if (state.path === "/leave-request") return renderLeaveRequest();
  if (state.path === "/clock-correction") return renderClockCorrection();
  if (state.path === "/clock-correction/edit") return renderCorrectionForm();
  if (state.path === "/overtime-request") return renderOvertimeRequest();
  if (state.path === "/calendar") return renderCalendar();
  if (state.path === "/daily-report") return renderDailyReport();
  if (state.path === "/monthly-report") return renderMonthlyReport();
  if (state.path === "/admin/approvals") return renderApprovals();
  if (state.path === "/admin/member-attendance") return renderCompanyAttendance();
  if (state.path === "/admin/monthly-close") return renderMonthlyClose();
  if (state.path === "/admin/employee-master") return renderEmployees();
  return renderDashboard();
}
function renderDashboard() {
  const pending = state.approvals.filter((item) => item.status === "pending").length;
  const missing = state.employees.filter((item) => item.status === "未出勤").length;
  return `
    <section class="dashboard-kpi-section">
      <div class="dashboard-kpi-header">
        <div>
          <h1>ダッシュボード</h1>
          <p>${todayLabel()}</p>
        </div>
        <div class="dashboard-kpi-actions">
          <button class="button neutral">未出勤</button>
          <button class="button primary" data-nav="/attendance">${icon("clock")}出勤</button>
        </div>
      </div>
      <div class="kpi-grid">
        <article class="kpi-card">
          <div class="kpi-card-top">
            <div class="kpi-label">出勤日数</div>
            <div class="kpi-icon">${icon("calendar")}</div>
          </div>
          <div class="kpi-value"><strong>0</strong><span>日</span></div>
        </article>
        <article class="kpi-card">
          <div class="kpi-card-top">
            <div class="kpi-label">勤務時間</div>
            <div class="kpi-icon">${icon("clock")}</div>
          </div>
          <div class="kpi-value"><strong>0</strong><span>h</span></div>
        </article>
        <article class="kpi-card">
          <div class="kpi-card-top">
            <div class="kpi-label">残業</div>
          </div>
          <div class="kpi-value"><strong>0</strong><span>/45h</span></div>
          <div class="kpi-progress"><span style="width:0%"></span></div>
        </article>
        <article class="kpi-card">
          <div class="kpi-card-top">
            <div class="kpi-label">有給残</div>
          </div>
          <div class="kpi-value"><strong>17.5</strong><span>日</span></div>
          <div class="kpi-note">今年度の利用可能な有給残日数</div>
        </article>
      </div>
    </section>
    <section class="grid cols-2" style="margin-top:16px">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>今日の打刻</h2>
            <p>${todayLabel()}</p>
          </div>
          ${badge(state.attendance.status)}
        </div>
        <div class="time-line">
          ${state.attendance.logs.map((item) => `
            <div class="timeline-item">
              <div class="timeline-time">${item.time}</div>
              <div class="timeline-label">${item.label}</div>
            </div>
          `).join("")}
        </div>
        <div style="margin-top:16px">
          <button class="button primary" data-nav="/attendance">${icon("clock")}打刻画面へ</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>${state.role === "admin" ? "管理サマリ" : "お知らせ"}</h2>
            <p>${state.role === "admin" ? "総務担当者向けの確認項目" : "今週の勤怠確認"}</p>
          </div>
        </div>
        ${state.role === "admin" ? `
          <div class="employee-list">
            <div class="item">
              <div class="item-row">
                <div><div class="item-title">本日未打刻者</div><div class="item-meta">出勤打刻がまだありません</div></div>
                ${badge("missing_clock_out", `${missing}名`)}
              </div>
            </div>
            <div class="item">
              <div class="item-row">
                <div><div class="item-title">修正申請</div><div class="item-meta">理由と対象時刻を確認してください</div></div>
                <button class="button secondary" data-nav="/admin/approvals">${icon("approvals")}確認</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="employee-list">
            <div class="item">
              <div class="item-title">7月の締め処理</div>
              <div class="item-meta">月末までに未打刻日の修正申請を提出してください。</div>
            </div>
            <div class="item">
              <div class="item-title">リモート勤務の打刻</div>
              <div class="item-meta">出社日と同じ画面から打刻できます。</div>
            </div>
          </div>
        `}
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <div>
          <h2>直近6日の勤務時間</h2>
          <p>集計作業を短縮するための月次サマリ</p>
        </div>
      </div>
      <div class="chart">
        ${[8.1, 7.7, 8.3, 0, 8.2, 7.9].map((hours) => `<div class="bar" style="height:${Math.max(hours * 11, 8)}%"><span>${hours ? hours.toFixed(1) : "休"}</span></div>`).join("")}
      </div>
    </section>
  `;
}
function renderAttendance() {
  const status = state.attendance.status;
  const pending = state.punchPending;
  return `
    <section class="status-hero">
      <div class="clock-panel">
        <div>
          <div class="clock-status">${statusLabels[status]}</div>
          <div class="clock-time" data-clock>${nowTime()}</div>
          <div class="clock-date">${todayLabel()}</div>
        </div>
        <div>
          <div>出勤 ${state.attendance.clockIn || "-"} / 退勤 ${state.attendance.clockOut || "-"}</div>
          <div style="margin-top:6px;opacity:.82">形態 ${state.attendance.workType} / 休憩 ${state.attendance.breakCount}回、合計 ${state.attendance.breakMinutes}分</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>打刻操作</h2>
            <p>ステータス遷移に従って操作できます</p>
          </div>
        </div>
        <div class="form-field attendance-type-field">
          <label>出勤形態</label>
          <select class="select" id="attendance-work-type" ${status === "done" || pending ? "disabled" : ""}>
            ${attendanceTypes.map((type) => `<option value="${type}" ${state.attendance.workType === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </div>
        <div class="actions-grid">
          <button class="action-button primary" data-punch="clockIn" ${status !== "not_started" || pending ? "disabled" : ""}>
            <strong>出勤</strong><span>勤務を開始</span>
          </button>
          <button class="action-button secondary" data-punch="breakStart" ${status !== "working" || pending ? "disabled" : ""}>
            <strong>休憩開始</strong><span>休憩に入る</span>
          </button>
          <button class="action-button secondary" data-punch="breakEnd" ${status !== "break" || pending ? "disabled" : ""}>
            <strong>休憩終了</strong><span>勤務に戻る</span>
          </button>
          <button class="action-button danger" data-punch="clockOut" ${status !== "working" || pending ? "disabled" : ""}>
            <strong>退勤</strong><span>勤務を終了</span>
          </button>
        </div>
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <div>
          <h2>本日の記録</h2>
          <p>打刻の証跡として保存される内容</p>
        </div>
      </div>
      <div class="time-line">
        ${state.attendance.logs.length ? state.attendance.logs.map((item) => `
          <div class="timeline-item">
            <div class="timeline-time">${item.time}</div>
            <div class="timeline-label">${item.label}</div>
          </div>
        `).join("") : '<div class="empty">本日の打刻はまだありません</div>'}
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <div>
          <h2>打刻履歴一覧</h2>
          <p>出勤、休憩、退勤の操作履歴</p>
        </div>
        ${badge("normal", `${state.punchHistory.length}件`)}
      </div>
      ${renderPunchHistoryTable()}
    </section>
  `;
}
function renderPunchHistoryTable() {
  if (!state.punchHistory.length) return '<div class="empty">打刻履歴はまだありません</div>';
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日付</th>
            <th>時刻</th>
            <th>操作</th>
            <th>出勤形態</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          ${state.punchHistory.map((item) => `
            <tr>
              <td>${item.date}</td>
              <td>${item.time}</td>
              <td><strong>${item.action}</strong></td>
              <td>${item.workType}</td>
              <td>${badge(item.status)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
function renderClockCorrection() {
  return `
    <section class="panel">
      <div class="toolbar">
        <div class="panel-header" style="margin:0">
          <div>
            <h2>2026年7月</h2>
            <p>打刻漏れや時刻誤りがある日は修正申請を作成できます</p>
          </div>
        </div>
        <div class="field-row">
          <select class="select" aria-label="月選択">
            <option>2026年7月</option>
            <option>2026年6月</option>
            <option>2026年5月</option>
          </select>
          <button class="button neutral">${icon("download")}CSV</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>出勤</th>
              <th>退勤</th>
              <th>勤務時間</th>
              <th>残業</th>
              <th>ステータス</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${state.history.map((row) => `
              <tr class="${row.status === "missing_clock_out" ? "row-alert" : ""}">
                <td>${row.date}</td>
                <td>${row.clockIn}</td>
                <td>${row.clockOut || "-"}</td>
                <td>${row.work}</td>
                <td>${row.overtime}</td>
                <td>${badge(row.status)}</td>
                <td><button class="button neutral compact" data-edit="${row.id}">${icon("approvals")}申請</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function renderCorrectionForm() {
  const id = window.location.hash.split("?id=")[1] || state.history[2].id;
  const record = state.history.find((item) => item.id === id) || state.history[2];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>${record.date} の修正申請</h2>
          <p>申請理由、修正後の時刻、証跡を残します</p>
        </div>
        ${badge(record.status)}
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label>出勤時刻</label>
          <input class="input" id="edit-clock-in" value="${record.clockIn === "-" ? "" : record.clockIn}" placeholder="09:00" />
        </div>
        <div class="form-field">
          <label>退勤時刻</label>
          <input class="input" id="edit-clock-out" value="${record.clockOut || ""}" placeholder="18:00" />
        </div>
        <div class="form-field">
          <label>休憩時間</label>
          <select class="select" id="edit-break">
            <option>60分</option>
            <option>45分</option>
            <option>90分</option>
          </select>
        </div>
        <div class="form-field">
          <label>申請種別</label>
          <select class="select" id="edit-type">
            <option>打刻忘れ</option>
            <option>時刻誤り</option>
            <option>休憩修正</option>
          </select>
        </div>
      </div>
      <div class="form-field" style="margin-top:14px">
        <label>修正理由</label>
        <textarea class="textarea" id="edit-reason" placeholder="例: 外出先から直帰し、退勤打刻を忘れたため"></textarea>
      </div>
      <div class="field-row" style="margin-top:16px">
        <button class="button primary compact" data-submit-correction="${record.id}">${icon("approvals")}申請する</button>
        <button class="button neutral" data-nav="/clock-correction">${icon("close")}戻る</button>
      </div>
    </section>
  `;
}
function renderEmployees() {
  const filtered = state.employees.filter((employee) => {
    const textMatch = `${employee.name}${employee.department}`.includes(state.employeeFilter);
    const departmentMatch = state.departmentFilter === "all" || employee.department === state.departmentFilter;
    return textMatch && departmentMatch;
  });
  return `
    <section class="panel">
      <div class="toolbar">
        <div class="field-row">
          <input class="input" id="employee-search" value="${state.employeeFilter}" placeholder="社員名・部署で検索" />
          <select class="select" id="department-filter">
            <option value="all" ${state.departmentFilter === "all" ? "selected" : ""}>全部署</option>
            <option value="営業部" ${state.departmentFilter === "営業部" ? "selected" : ""}>営業部</option>
            <option value="開発部" ${state.departmentFilter === "開発部" ? "selected" : ""}>開発部</option>
            <option value="管理部" ${state.departmentFilter === "管理部" ? "selected" : ""}>管理部</option>
          </select>
        </div>
        <button class="button primary" data-action="add-employee">${icon("plus")}社員追加</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>社員</th><th>部署</th><th>ロール</th><th>本日の状態</th><th>本日の打刻</th><th>月間勤務</th></tr></thead>
          <tbody>
            ${filtered.map((employee) => `
              <tr class="${employee.status === "未出勤" ? "row-alert" : ""}">
                <td><strong>${employee.name}</strong></td>
                <td>${employee.department}</td>
                <td>${badge(employee.role === "admin" ? "correction_approved" : "normal", employee.role)}</td>
                <td>${badge(employee.status === "未出勤" ? "missing_clock_out" : "normal", employee.status)}</td>
                <td>${employee.today}</td>
                <td>${employee.month}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function renderCompanyAttendance() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>2026/07/07 の勤怠</h2>
          <p>未打刻者をハイライト表示</p>
        </div>
        <button class="button neutral">${icon("download")}CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>社員</th><th>部署</th><th>出勤</th><th>退勤</th><th>休憩</th><th>状態</th></tr></thead>
          <tbody>
            ${state.employees.map((employee) => {
              const parts = employee.today.split(" - ");
              return `
                <tr class="${employee.status === "未出勤" ? "row-alert" : ""}">
                  <td><strong>${employee.name}</strong></td>
                  <td>${employee.department}</td>
                  <td>${parts[0] || "-"}</td>
                  <td>${parts[1] || "-"}</td>
                  <td>${employee.status === "未出勤" ? "-" : "60分"}</td>
                  <td>${badge(employee.status === "未出勤" ? "missing_clock_out" : employee.status === "休憩中" ? "break" : "normal", employee.status)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function renderApprovals() {
  const pending = state.approvals.filter((item) => item.status === "pending");
  const closed = state.approvals.filter((item) => item.status !== "pending");
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>未承認</h2>
            <p>承認または却下で証跡を残します</p>
          </div>
          ${badge("correction_pending", `${pending.length}件`)}
        </div>
        <div class="approval-list">
          ${pending.length ? pending.map(renderApprovalItem).join("") : '<div class="empty">未承認の申請はありません</div>'}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>処理済み</h2>
            <p>直近の承認履歴</p>
          </div>
        </div>
        <div class="approval-list">
          ${closed.map(renderApprovalItem).join("")}
        </div>
      </div>
    </section>
  `;
}
function renderApprovalItem(item) {
  const status = item.status === "pending" ? "correction_pending" : item.status === "approved" ? "correction_approved" : "correction_rejected";
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${item.employee} / ${item.date}</div>
          <div class="item-meta">${item.department}・${item.requested}</div>
        </div>
        ${badge(status)}
      </div>
      <div class="item-meta">${item.reason}</div>
      ${item.status === "pending" ? `
        <div class="field-row">
          <button class="button primary" data-approval="${item.id}" data-decision="approved">${icon("check")}承認</button>
          <button class="button danger" data-approval="${item.id}" data-decision="rejected">${icon("close")}却下</button>
        </div>
      ` : ""}
    </article>
  `;
}
function addPunchHistory(action, time, status, options = {}) {
  state.punchHistory = [
    {
      id: nextNumericId(state.punchHistory),
      date: toDisplayDate(options.workDate || currentIsoDate()),
      time,
      action,
      workType: options.workType || state.attendance.workType,
      status
    },
    ...state.punchHistory
  ];
}
function canPersistAttendance() {
  return Boolean(
    state.currentUser?.id &&
    window.supabaseAuth?.isConfigured() &&
    window.supabaseAuth?.getAttendanceByDate &&
    window.supabaseAuth?.createAttendance &&
    window.supabaseAuth?.updateAttendance
  );
}
function findOpenBreakIndex(breaks) {
  for (let index = breaks.length - 1; index >= 0; index -= 1) {
    if (breaks[index]?.start && !breaks[index].end) return index;
  }
  return -1;
}
function applyLocalPunch(action, occurredAt) {
  const time = nowTime(occurredAt);
  const workDate = currentIsoDate(occurredAt);
  if (action === "clockIn") {
    state.attendance.status = "working";
    state.attendance.workDate = workDate;
    state.attendance.clockIn = time;
    state.attendance.logs.push({ time, label: `出勤打刻（${state.attendance.workType}）` });
    state.history[0] = { ...state.history[0], id: workDate, date: toDisplayDate(workDate), clockIn: toMinuteTime(time), work: "進行中", status: "working", workType: state.attendance.workType };
    addPunchHistory("出勤", time, "working", { workDate });
  }
  if (action === "breakStart") {
    state.attendance.status = "break";
    state.attendance.breakCount += 1;
    state.attendance.logs.push({ time, label: "休憩開始" });
    addPunchHistory("休憩開始", time, "break", { workDate: state.attendance.workDate || workDate });
  }
  if (action === "breakEnd") {
    state.attendance.status = "working";
    state.attendance.breakMinutes += 60;
    state.attendance.logs.push({ time, label: "休憩終了" });
    addPunchHistory("休憩終了", time, "working", { workDate: state.attendance.workDate || workDate });
  }
  if (action === "clockOut") {
    state.attendance.status = "done";
    state.attendance.clockOut = time;
    state.attendance.logs.push({ time, label: "退勤打刻" });
    state.history[0] = { ...state.history[0], clockOut: toMinuteTime(time), work: "8:00", overtime: "0:00", status: "normal" };
    addPunchHistory("退勤", time, "done", { workDate: state.attendance.workDate || workDate });
  }
  updateCurrentEmployeeSummary();
}
async function fetchAttendanceForPunch(workDate) {
  return window.supabaseAuth.getAttendanceByDate(state.currentUser.id, workDate);
}
async function persistClockIn(occurredAt) {
  const workDate = currentIsoDate(occurredAt);
  const timestamp = occurredAt.toISOString();
  const existing = await fetchAttendanceForPunch(workDate);

  if (existing?.clock_in) {
    applyAttendanceRecord(existing);
    setToast("本日の出勤は記録済みです。");
    return;
  }

  if (existing) {
    const updated = await window.supabaseAuth.updateAttendance(existing.id, {
      work_type: state.attendance.workType,
      clock_in: timestamp,
      status: "working"
    });
    applyAttendanceRecord(updated);
    addPunchHistory("出勤", utcToJapanTime(updated.clock_in), "working", {
      workDate: updated.work_date,
      workType: updated.work_type
    });
    setToast("出勤を記録しました。");
    return;
  }

  try {
    const created = await window.supabaseAuth.createAttendance({
      user_id: state.currentUser.id,
      work_date: workDate,
      work_type: state.attendance.workType,
      clock_in: timestamp,
      break_minutes: 0,
      breaks: [],
      status: "working"
    });
    applyAttendanceRecord(created);
    addPunchHistory("出勤", utcToJapanTime(created.clock_in), "working", {
      workDate: created.work_date,
      workType: created.work_type
    });
    setToast("出勤を記録しました。");
  } catch (error) {
    if (error?.code !== "23505") throw error;
    const duplicate = await fetchAttendanceForPunch(workDate);
    applyAttendanceRecord(duplicate);
    setToast("本日の出勤は記録済みです。");
  }
}
async function persistBreakStart(occurredAt) {
  const workDate = state.attendance.workDate || currentIsoDate(occurredAt);
  const record = await fetchAttendanceForPunch(workDate);
  if (!record?.clock_in) {
    applyAttendanceRecord(record);
    setToast("先に出勤打刻をしてください。");
    return;
  }

  const breaks = normalizeBreaks(record.breaks);
  if (findOpenBreakIndex(breaks) >= 0) {
    applyAttendanceRecord(record);
    setToast("休憩開始は記録済みです。");
    return;
  }

  breaks.push({ start: occurredAt.toISOString(), end: null });
  const updated = await window.supabaseAuth.updateAttendance(record.id, {
    status: "break",
    breaks
  });
  applyAttendanceRecord(updated);
  addPunchHistory("休憩開始", utcToJapanTime(occurredAt), "break", {
    workDate: updated.work_date,
    workType: updated.work_type
  });
  setToast("休憩開始を記録しました。");
}
async function persistBreakEnd(occurredAt) {
  const workDate = state.attendance.workDate || currentIsoDate(occurredAt);
  const record = await fetchAttendanceForPunch(workDate);
  const breaks = normalizeBreaks(record?.breaks);
  const openIndex = findOpenBreakIndex(breaks);

  if (!record?.clock_in || openIndex < 0) {
    applyAttendanceRecord(record);
    setToast("終了対象の休憩がありません。");
    return;
  }

  breaks[openIndex] = { ...breaks[openIndex], end: occurredAt.toISOString() };
  const updated = await window.supabaseAuth.updateAttendance(record.id, {
    status: "working",
    breaks,
    break_minutes: Math.round(totalBreakMinutes(breaks))
  });
  applyAttendanceRecord(updated);
  addPunchHistory("休憩終了", utcToJapanTime(occurredAt), "working", {
    workDate: updated.work_date,
    workType: updated.work_type
  });
  setToast("休憩終了を記録しました。");
}
async function persistClockOut(occurredAt) {
  const workDate = state.attendance.workDate || currentIsoDate(occurredAt);
  const record = await fetchAttendanceForPunch(workDate);

  if (!record?.clock_in) {
    applyAttendanceRecord(record);
    setToast("出勤レコードがないため退勤を記録できません。");
    return;
  }

  if (record.clock_out) {
    applyAttendanceRecord(record);
    setToast("本日の退勤は記録済みです。");
    return;
  }

  const updated = await window.supabaseAuth.updateAttendance(record.id, {
    clock_out: occurredAt.toISOString(),
    status: "normal",
    break_minutes: recordBreakMinutes(record),
    breaks: normalizeBreaks(record.breaks)
  });
  applyAttendanceRecord(updated);
  addPunchHistory("退勤", utcToJapanTime(updated.clock_out), "done", {
    workDate: updated.work_date,
    workType: updated.work_type
  });
  setToast("退勤を記録しました。");
}
function attendanceErrorMessage(error) {
  if (error?.code === "23505") return "本日の勤怠レコードは既に存在します。";
  return error?.message || "勤怠記録に失敗しました。";
}
async function handlePunch(action) {
  if (state.punchPending) return;
  const occurredAt = new Date();

  if (!canPersistAttendance()) {
    applyLocalPunch(action, occurredAt);
    render();
    return;
  }

  state.punchPending = true;
  render();

  try {
    if (action === "clockIn") await persistClockIn(occurredAt);
    if (action === "breakStart") await persistBreakStart(occurredAt);
    if (action === "breakEnd") await persistBreakEnd(occurredAt);
    if (action === "clockOut") await persistClockOut(occurredAt);
  } catch (error) {
    console.error(error);
    setToast(attendanceErrorMessage(error));
  } finally {
    state.punchPending = false;
    render();
  }
}
function submitCorrection(id) {
  const reason = document.querySelector("#edit-reason").value.trim();
  if (!reason) {
    setToast("修正理由を入力してください。");
    return;
  }
  state.history = state.history.map((item) => item.id === id ? { ...item, status: "correction_pending" } : item);
  setToast("修正申請を提出しました。");
  setPath("/clock-correction");
}
function submitShiftRequest() {
  const requestDate = document.querySelector("#shift-date").value;
  const shift = document.querySelector("#shift-type").value;
  const start = document.querySelector("#shift-start").value;
  const end = document.querySelector("#shift-end").value;
  const reason = document.querySelector("#shift-reason").value.trim();
  if (!requestDate || !shift || !reason) {
    setToast("希望日、シフト区分、申請理由を入力してください。");
    return;
  }
  const time = shift === "休暇" ? "-" : `${start || "-"} - ${end || "-"}`;
  state.shiftRequests = [
    {
      id: nextNumericId(state.shiftRequests),
      requestDate: toDisplayDate(requestDate),
      shift,
      time,
      reason,
      submittedAt: toDisplayDate(currentIsoDate()),
      status: "shift_pending"
    },
    ...state.shiftRequests
  ];
  setToast("シフト申請を提出しました。");
}
function submitLeaveRequest() {
  const requestDate = document.querySelector("#leave-date").value;
  const typeField = document.querySelector("#leave-type");
  const selectedType = typeField.options[typeField.selectedIndex];
  const reason = document.querySelector("#leave-reason").value.trim();
  if (!requestDate || !selectedType.value || !reason) {
    setToast("休暇日、区分、理由を入力してください。");
    return;
  }
  state.leaveRequests = [
    {
      id: nextNumericId(state.leaveRequests),
      requestDate: toDisplayDate(requestDate),
      type: selectedType.value,
      days: Number(selectedType.dataset.days || 1),
      reason,
      submittedAt: toDisplayDate(currentIsoDate()),
      status: "shift_pending"
    },
    ...state.leaveRequests
  ];
  setToast("休暇申請を提出しました。");
}
function overtimeHours(endTime) {
  const [hour, minute] = endTime.split(":").map(Number);
  const endMinutes = hour * 60 + minute;
  const baseMinutes = 18 * 60;
  const diff = Math.max(endMinutes - baseMinutes, 0);
  return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, "0")}`;
}
function submitOvertimeRequest() {
  const requestDate = document.querySelector("#overtime-date").value;
  const endTime = document.querySelector("#overtime-end").value;
  const reason = document.querySelector("#overtime-reason").value.trim();
  if (!requestDate || !endTime || !reason) {
    setToast("対象日、予定終了、理由を入力してください。");
    return;
  }
  state.overtimeRequests = [
    {
      id: nextNumericId(state.overtimeRequests),
      requestDate: toDisplayDate(requestDate),
      endTime,
      hours: overtimeHours(endTime),
      reason,
      submittedAt: toDisplayDate(currentIsoDate()),
      status: "shift_pending"
    },
    ...state.overtimeRequests
  ];
  setToast("残業申請を提出しました。");
}
function saveDailyReport() {
  const date = document.querySelector("#report-date").value;
  const title = document.querySelector("#report-title").value.trim();
  const body = document.querySelector("#report-body").value.trim();
  const next = document.querySelector("#report-next").value.trim();
  if (!date || !title || !body) {
    setToast("日付、件名、業務内容を入力してください。");
    return;
  }
  const payload = { date: toDisplayDate(date), title, body, next: next || "-" };
  if (state.reportEditingId) {
    state.dailyReports = state.dailyReports.map((item) => item.id === state.reportEditingId ? { ...item, ...payload } : item);
    state.reportEditingId = null;
    setToast("日報を更新しました。");
    return;
  }
  state.dailyReports = [{ id: nextNumericId(state.dailyReports), ...payload }, ...state.dailyReports];
  setToast("日報を作成しました。");
}
function deleteDailyReport(id) {
  state.dailyReports = state.dailyReports.filter((item) => item.id !== id);
  if (state.reportEditingId === id) state.reportEditingId = null;
  setToast("日報を削除しました。");
}
function authErrorMessage(error) {
  const message = error?.message || "";
  if (message.includes("email rate limit exceeded")) {
    return "確認メールの送信上限に達しています。SupabaseのAuth設定でメール確認をOFFにするか、時間を置いてから再度登録してください。";
  }
  if (message.includes("User already registered")) {
    return "このメールアドレスは既に登録されています。ログインしてください。";
  }
  if (message.includes("Password should be at least 6 characters")) {
    return "パスワードは6文字以上で入力してください。";
  }
  return error?.message || "認証処理に失敗しました。";
}
function validateEmailPassword(email, password) {
  if (!email || !password) {
    setToast("メールアドレスとパスワードを入力してください。");
    return false;
  }
  if (password.length < 6) {
    setToast("パスワードは6文字以上で入力してください。");
    return false;
  }
  return true;
}
async function login() {
  const email = document.querySelector("#login-email").value.trim();
  const password = document.querySelector("#login-password").value.trim();
  if (!validateEmailPassword(email, password)) return;
  setAuthPending(true);
  state.authError = "";
  try {
    const profile = await window.supabaseAuth.signIn(email, password);
    applyAuthProfile(profile);
    await loadTodayAttendanceSafely();
    setPath("/dashboard");
    render();
  } catch (error) {
    state.authError = authErrorMessage(error);
    render();
  } finally {
    setAuthPending(false);
    render();
  }
}
async function signup() {
  const email = document.querySelector("#signup-email").value.trim();
  const password = document.querySelector("#signup-password").value.trim();
  if (!validateEmailPassword(email, password)) return;
  setAuthPending(true);
  state.authError = "";
  try {
    const result = await window.supabaseAuth.signUp(email, password);

    if (!result.profile) {
      state.authMode = "login";
      state.toast = result.needsConfirmation
        ? "確認メールを送信しました。メール認証後にログインしてください。"
        : "新規登録を受け付けました。ログインしてください。";
      render();
      return;
    }

    applyAuthProfile(result.profile);
    await loadTodayAttendanceSafely();
    setPath("/dashboard");
    render();
  } catch (error) {
    state.authError = authErrorMessage(error);
    render();
  } finally {
    setAuthPending(false);
    render();
  }
}
document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-auth-form]");
  if (!form) return;
  event.preventDefault();
  if (form.dataset.authForm === "signup") {
    await signup();
    return;
  }
  await login();
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest("button, [data-action]");
  if (!target) return;
  const authMode = target.dataset.authMode;
  if (authMode) {
    state.authMode = authMode;
    state.authError = "";
    state.toast = "";
    render();
    return;
  }
  if (target.dataset.action === "login") {
    await login();
    return;
  }
  if (target.dataset.action === "signup") {
    await signup();
    return;
  }
  const nav = target.dataset.nav;
  if (nav) {
    state.sidebarOpen = false;
    setPath(nav);
    return;
  }
  const punch = target.dataset.punch;
  if (punch) {
    await handlePunch(punch);
    return;
  }
  const editId = target.dataset.edit;
  if (editId) {
    setPath(`/clock-correction/edit?id=${editId}`);
    return;
  }
  const correctionId = target.dataset.submitCorrection;
  if (correctionId) {
    submitCorrection(correctionId);
    return;
  }
  if ("submitShift" in target.dataset) {
    submitShiftRequest();
    return;
  }
  if ("saveReport" in target.dataset) {
    saveDailyReport();
    return;
  }
  const reportEditId = target.dataset.editReport;
  if (reportEditId) {
    state.reportEditingId = Number(reportEditId);
    render();
    return;
  }
  const reportDeleteId = target.dataset.deleteReport;
  if (reportDeleteId) {
    deleteDailyReport(Number(reportDeleteId));
    return;
  }
  if ("cancelReport" in target.dataset) {
    state.reportEditingId = null;
    render();
    return;
  }
  const approvalId = target.dataset.approval;
  if (approvalId) {
    state.approvals = state.approvals.map((item) => item.id === Number(approvalId) ? { ...item, status: target.dataset.decision } : item);
    setToast(target.dataset.decision === "approved" ? "申請を承認しました。" : "申請を却下しました。");
    return;
  }
  if (target.dataset.action === "open-sidebar") {
    state.sidebarOpen = true;
    render();
  }
  if (target.dataset.action === "close-sidebar") {
    state.sidebarOpen = false;
    render();
  }
  if (target.dataset.action === "logout") {
    try {
      await window.supabaseAuth.signOut();
    } catch (error) {
      state.authError = authErrorMessage(error);
    }
    clearAuthState();
    setPath("/login");
    render();
    return;
  }
  if (target.dataset.action === "add-employee") {
    setToast("社員追加フォームを開く想定の操作です。");
  }
  if (target.dataset.action === "save-settings") {
    setToast("設定を保存しました。");
  }
  if (target.dataset.action === "save-leave-request") {
    submitLeaveRequest();
  }
  if (target.dataset.action === "save-overtime-request") {
    submitOvertimeRequest();
  }
  if (target.dataset.action === "submit-request") {
    setToast("申請を提出しました。");
  }
  if (target.dataset.action === "save-daily-report") {
    setToast("日報を保存しました。");
  }
  if (target.dataset.action === "close-month") {
    setToast("月次締め処理を実行しました。");
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "employee-search") {
    state.employeeFilter = event.target.value;
    render();
  }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "attendance-work-type") {
    state.attendance.workType = event.target.value;
    render();
  }
  if (event.target.id === "department-filter") {
    state.departmentFilter = event.target.value;
    render();
  }
});
window.addEventListener("hashchange", render);
window.setInterval(() => {
  const clock = document.querySelector("[data-clock]");
  if (clock) clock.textContent = nowTime();
}, 1000);
if (!window.location.hash) {
  window.location.hash = "/dashboard";
}
async function initializeAuth() {
  render();

  if (!window.supabaseAuth?.isConfigured()) {
    state.authReady = true;
    state.authError = "Supabase設定が未完了です。supabase-config.js にanon keyを設定してください。";
    render();
    return;
  }

  try {
    const profile = await window.supabaseAuth.getSessionProfile();
    if (profile) {
      applyAuthProfile(profile);
      await loadTodayAttendanceSafely();
    }
  } catch (error) {
    state.authError = authErrorMessage(error);
  } finally {
    state.authReady = true;
    render();
  }

  window.supabaseAuth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      clearAuthState();
      setPath("/login");
      render();
      return;
    }

    if (!session?.user) return;

    try {
      const profile = await window.supabaseAuth.getSessionProfile();
      if (profile) {
        applyAuthProfile(profile);
        await loadTodayAttendanceSafely();
        render();
      }
    } catch (error) {
      state.authError = authErrorMessage(error);
      render();
    }
  });
}
initializeAuth();
