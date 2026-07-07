const app = document.querySelector("#app");
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
  return hash || "/dashboard";
}
function normalizePath(path) {
  if (path.startsWith("/clock-correction/edit") || path.startsWith("/history/edit")) return "/clock-correction/edit";
  return pageMeta[path] ? path : "/dashboard";
}
function todayLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "full",
    timeZone: "Asia/Tokyo"
  }).format(new Date());
}
function nowTime() {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo"
  }).format(new Date());
}
function currentIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo"
  }).format(new Date());
}
function toDisplayDate(isoDate) {
  return isoDate ? isoDate.replace(/-/g, "/") : "";
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
function setPath(path) {
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
  if (state.role === "member" && state.path.startsWith("/admin")) {
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
    </div>
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
    if (!item.roles.includes(state.role)) return "";
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
function renderAccount() {
  const name = state.role === "admin" ? "鈴木 美咲" : "田中 花子";
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
        <div class="role-toggle" aria-label="ロール切替">
          <button class="${state.role === "admin" ? "active" : ""}" data-role="admin">管理者</button>
          <button class="${state.role === "member" ? "active" : ""}" data-role="member">社員</button>
        </div>
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
  const workDays = state.history.filter(isAttendanceDay).length;
  const grantedLeave = state.leaveSummary.annualGranted + state.leaveSummary.carriedOver;
  const usedLeave = state.leaveSummary.used;
  const remainingLeave = Math.max(grantedLeave - usedLeave, 0);
  return `
    <section class="grid cols-2">
      <article class="card stat-card primary">
        <div>
          <div class="stat-label">出勤日数</div>
          <div class="stat-value">${workDays}日</div>
        </div>
        <div class="stat-note">2026年7月 / 有給 1日</div>
      </article>
      <article class="card stat-card ok">
        <div>
          <div class="stat-label">勤務時間</div>
          <div class="stat-value">126:40</div>
        </div>
        <div class="stat-note">所定 120:00 / 実績集計</div>
      </article>
      <article class="card stat-card warn">
        <div>
          <div class="stat-label">残業</div>
          <div class="stat-value">6:40</div>
        </div>
        <div class="stat-note">承認待ち 2:00 / 上限内</div>
      </article>
      <article class="card stat-card">
        <div>
          <div class="stat-label">有給残</div>
          <div class="stat-value">${remainingLeave}日</div>
        </div>
        <div class="stat-note">付与 ${grantedLeave}日 / 使用 ${usedLeave}日</div>
      </article>
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
          <select class="select" id="attendance-work-type" ${status === "done" ? "disabled" : ""}>
            ${attendanceTypes.map((type) => `<option value="${type}" ${state.attendance.workType === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </div>
        <div class="actions-grid">
          <button class="action-button primary" data-punch="clockIn" ${status !== "not_started" ? "disabled" : ""}>
            <strong>出勤</strong><span>勤務を開始</span>
          </button>
          <button class="action-button secondary" data-punch="breakStart" ${status !== "working" ? "disabled" : ""}>
            <strong>休憩開始</strong><span>休憩に入る</span>
          </button>
          <button class="action-button secondary" data-punch="breakEnd" ${status !== "break" ? "disabled" : ""}>
            <strong>休憩終了</strong><span>勤務に戻る</span>
          </button>
          <button class="action-button danger" data-punch="clockOut" ${status !== "working" ? "disabled" : ""}>
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
function addPunchHistory(action, time, status) {
  state.punchHistory = [
    {
      id: nextNumericId(state.punchHistory),
      date: toDisplayDate(currentIsoDate()),
      time,
      action,
      workType: state.attendance.workType,
      status
    },
    ...state.punchHistory
  ];
}
function handlePunch(action) {
  const time = nowTime();
  if (action === "clockIn") {
    state.attendance.status = "working";
    state.attendance.clockIn = time;
    state.attendance.logs.push({ time, label: `出勤打刻（${state.attendance.workType}）` });
    state.history[0] = { ...state.history[0], clockIn: time, work: "進行中", status: "working", workType: state.attendance.workType };
    addPunchHistory("出勤", time, "working");
  }
  if (action === "breakStart") {
    state.attendance.status = "break";
    state.attendance.breakCount += 1;
    state.attendance.logs.push({ time, label: "休憩開始" });
    addPunchHistory("休憩開始", time, "break");
  }
  if (action === "breakEnd") {
    state.attendance.status = "working";
    state.attendance.breakMinutes += 60;
    state.attendance.logs.push({ time, label: "休憩終了" });
    addPunchHistory("休憩終了", time, "working");
  }
  if (action === "clockOut") {
    state.attendance.status = "done";
    state.attendance.clockOut = time;
    state.attendance.logs.push({ time, label: "退勤打刻" });
    state.history[0] = { ...state.history[0], clockOut: time, work: "8:00", overtime: "0:00", status: "normal" };
    addPunchHistory("退勤", time, "done");
  }
  render();
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
document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-action]");
  if (!target) return;
  const nav = target.dataset.nav;
  if (nav) {
    state.sidebarOpen = false;
    setPath(nav);
    return;
  }
  const role = target.dataset.role;
  if (role) {
    state.role = role;
    if (role === "member" && state.path.startsWith("/admin")) setPath("/dashboard");
    render();
    return;
  }
  const punch = target.dataset.punch;
  if (punch) {
    handlePunch(punch);
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
    setToast("デモ環境のためログアウト処理は省略しています。");
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
} else {
  render();
}
