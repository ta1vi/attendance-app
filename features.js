function renderShiftRequest() {
  const pending = state.shiftRequests.filter((item) => item.status === "shift_pending").length;
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>申請フォーム</h2>
            <p>希望日、区分、時間帯を入力します</p>
          </div>
          ${badge("shift_pending", `${pending}件待ち`)}
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label>希望日</label>
            <input class="input" type="date" id="shift-date" value="${currentIsoDate()}" />
          </div>
          <div class="form-field">
            <label>シフト区分</label>
            <select class="select" id="shift-type">
              <option>通常</option>
              <option>早番</option>
              <option>遅番</option>
              <option>休暇</option>
              <option>リモート</option>
            </select>
          </div>
          <div class="form-field">
            <label>開始</label>
            <input class="input" type="time" id="shift-start" value="09:00" />
          </div>
          <div class="form-field">
            <label>終了</label>
            <input class="input" type="time" id="shift-end" value="18:00" />
          </div>
        </div>
        <div class="form-field" style="margin-top:14px">
          <label>申請理由</label>
          <textarea class="textarea" id="shift-reason" placeholder="例: 顧客訪問に合わせて早番を希望"></textarea>
        </div>
        <div class="field-row" style="margin-top:16px">
          <button class="button primary compact" data-submit-shift>${icon("approvals")}申請する</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>申請履歴</h2>
            <p>提出済みのシフト申請ステータス</p>
          </div>
          ${badge("normal", `${state.shiftRequests.length}件`)}
        </div>
        ${renderShiftRequestHistory()}
      </div>
    </section>
  `;
}
function renderShiftRequestHistory() {
  if (!state.shiftRequests.length) return '<div class="empty">シフト申請履歴はまだありません</div>';
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>希望日</th>
            <th>区分</th>
            <th>時間帯</th>
            <th>理由</th>
            <th>申請日</th>
            <th>状態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${state.shiftRequests.map((item) => `
            <tr>
              <td>${escapeHtml(item.requestDate)}</td>
              <td><strong>${escapeHtml(item.shift)}</strong></td>
              <td>${escapeHtml(item.time)}</td>
              <td>${escapeHtml(item.reason)}</td>
              <td>${escapeHtml(item.submittedAt)}</td>
              <td>${badge(item.status)}</td>
              <td>${item.status === "shift_pending" ? `<button class="button danger compact" data-cancel-shift="${escapeHtml(String(item.id))}">キャンセル</button>` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
function leaveBalance() {
  const approvedUsed = state.leaveRequests
    .filter((item) => item.status === "shift_approved")
    .reduce((total, item) => total + item.days, 0);
  const grantedTotal = state.leaveSummary.annualGranted + state.leaveSummary.carriedOver;
  const usedDays = Math.max(state.leaveSummary.used, approvedUsed);
  return { grantedTotal, usedDays, remaining: Math.max(grantedTotal - usedDays, 0) };
}
function renderLeaveRequest() {
  const { grantedTotal, usedDays, remaining } = leaveBalance();
  return `
    <section class="grid cols-3">
      <article class="card stat-card primary">
        <div>
          <div class="stat-label">年間付与日数</div>
          <div class="stat-value">${grantedTotal}日</div>
        </div>
        <div class="stat-note">当年 ${state.leaveSummary.annualGranted}日 / 繰越 ${state.leaveSummary.carriedOver}日</div>
      </article>
      <article class="card stat-card warn">
        <div>
          <div class="stat-label">消化済み</div>
          <div class="stat-value">${usedDays}日</div>
        </div>
        <div class="stat-note">承認済み休暇を反映</div>
      </article>
      <article class="card stat-card ok">
        <div>
          <div class="stat-label">残日数</div>
          <div class="stat-value">${remaining}日</div>
        </div>
        <div class="stat-note">申請中 ${state.leaveRequests.filter((item) => item.status === "shift_pending").length}件</div>
      </article>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <div>
          <h2>休暇申請</h2>
          <p>有給休暇や特別休暇の希望を提出します</p>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-field"><label>休暇日</label><input class="input" id="leave-date" type="date" value="${currentIsoDate()}" /></div>
        <div class="form-field">
          <label>区分</label>
          <select class="select" id="leave-type">
            <option value="有給休暇" data-days="1">有給休暇</option>
            <option value="午前休" data-days="0.5">午前休</option>
            <option value="午後休" data-days="0.5">午後休</option>
            <option value="特別休暇" data-days="1">特別休暇</option>
          </select>
        </div>
      </div>
      <div class="form-field" style="margin-top:14px"><label>理由</label><textarea class="textarea" id="leave-reason" placeholder="例: 私用のため"></textarea></div>
      <div style="margin-top:16px"><button class="button primary compact" data-action="save-leave-request">${icon("approvals")}申請する</button></div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <div>
          <h2>申請履歴</h2>
          <p>提出済みの休暇申請ステータス</p>
        </div>
        ${badge("normal", `${state.leaveRequests.length}件`)}
      </div>
      ${renderLeaveRequestHistory()}
    </section>
  `;
}
function renderLeaveRequestHistory() {
  if (!state.leaveRequests.length) return '<div class="empty">休暇申請履歴はまだありません</div>';
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>休暇日</th>
            <th>区分</th>
            <th>日数</th>
            <th>理由</th>
            <th>申請日</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          ${state.leaveRequests.map((item) => `
            <tr>
              <td>${escapeHtml(item.requestDate)}</td>
              <td><strong>${escapeHtml(item.type)}</strong></td>
              <td>${item.days}日</td>
              <td>${escapeHtml(item.reason)}</td>
              <td>${escapeHtml(item.submittedAt)}</td>
              <td>${badge(item.status)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
function renderOvertimeRequest() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>残業申請</h2>
          <p>予定残業時間と理由を提出します</p>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-field"><label>対象日</label><input class="input" id="overtime-date" type="date" value="${currentIsoDate()}" /></div>
        <div class="form-field"><label>予定終了</label><input class="input" id="overtime-end" type="time" value="20:00" /></div>
      </div>
      <div class="form-field" style="margin-top:14px"><label>理由</label><textarea class="textarea" id="overtime-reason" placeholder="例: 月次資料作成のため"></textarea></div>
      <div style="margin-top:16px"><button class="button primary compact" data-action="save-overtime-request">${icon("approvals")}申請する</button></div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <div>
          <h2>申請履歴</h2>
          <p>提出済みの残業申請ステータス</p>
        </div>
        ${badge("normal", `${state.overtimeRequests.length}件`)}
      </div>
      ${renderOvertimeRequestHistory()}
    </section>
  `;
}
function renderOvertimeRequestHistory() {
  if (!state.overtimeRequests.length) return '<div class="empty">残業申請履歴はまだありません</div>';
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>対象日</th>
            <th>予定終了</th>
            <th>予定残業</th>
            <th>理由</th>
            <th>申請日</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          ${state.overtimeRequests.map((item) => `
            <tr>
              <td>${escapeHtml(item.requestDate)}</td>
              <td>${escapeHtml(item.endTime)}</td>
              <td>${escapeHtml(item.hours)}</td>
              <td>${escapeHtml(item.reason)}</td>
              <td>${escapeHtml(item.submittedAt)}</td>
              <td>${badge(item.status)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
function renderCalendar() {
  ensureCalendarMonth();
  const { year, monthIndex } = state.calendar;
  const month = String(monthIndex + 1).padStart(2, "0");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const stats = state.calendarStats;
  const today = currentIsoDate();
  const recordByDate = new Map((state.calendarRecords || []).map((record) => [record.work_date, record]));
  const isWorkedRecord = (record) => Boolean(record?.clock_in) && record.status !== "paid_leave" && record.status !== "holiday";
  return `
    <section class="panel">
      <div class="toolbar">
        <div class="panel-header" style="margin:0">
          <div>
            <h2>勤怠カレンダー</h2>
            <p>出勤日、有給、シフトを月間で確認します</p>
          </div>
        </div>
        <div class="legend">
          <span><i class="dot attendance"></i>出勤</span>
          <span><i class="dot leave"></i>有給</span>
          <span><i class="dot shift"></i>シフト</span>
        </div>
      </div>
      <div class="grid calendar-stats-grid" style="margin:4px 0 16px">
        <article class="card stat-card ok"><div class="stat-top"><div class="stat-label">出勤日数</div><span class="metric-badge attend">${icon("calendar")}</span></div><div class="stat-value">${stats.workDays}日</div><div class="stat-note">${year}年${monthIndex + 1}月</div></article>
        <article class="card stat-card primary"><div class="stat-top"><div class="stat-label">合計勤務時間</div><span class="metric-badge time">${icon("clock")}</span></div><div class="stat-value">${formatMinutes(stats.totalMinutes)}</div><div class="stat-note">休憩を除く実働</div></article>
        <article class="card stat-card warn"><div class="stat-top"><div class="stat-label">残業時間</div><span class="metric-badge over">${icon("report")}</span></div><div class="stat-value">${formatMinutes(stats.overtimeMinutes)}</div><div class="stat-note">所定8時間の超過分</div></article>
      </div>
      <div class="calendar-nav">
        <button class="button neutral compact" data-cal-nav="prev" aria-label="前の月">${icon("chevronLeft")}前月</button>
        <h2>${year}年${monthIndex + 1}月</h2>
        <button class="button neutral compact" data-cal-nav="next" aria-label="次の月">翌月${icon("chevronRight")}</button>
      </div>
      <div class="calendar-grid">
        ${weekdays.map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
        ${calendarCells(year, monthIndex).map((day) => {
          if (!day) return '<div class="calendar-day muted"></div>';
          const dayText = String(day).padStart(2, "0");
          const isoDate = `${year}-${month}-${dayText}`;
          const displayDate = `${year}/${month}/${dayText}`;
          const record = recordByDate.get(isoDate);
          const worked = isWorkedRecord(record);
          const shift = state.shiftRequests.find((item) => item.requestDate === displayDate && item.status !== "shift_rejected");
          const dayClasses = ["calendar-day"];
          if (worked) dayClasses.push("has-attendance");
          if (record?.status === "missing_clock_out") dayClasses.push("has-warning");
          if (record?.status === "paid_leave") dayClasses.push("has-leave");
          if (isoDate === today) dayClasses.push("is-today");
          const clockIn = record?.clock_in ? utcToJapanTime(record.clock_in, { seconds: false }) : "";
          return `
            <div class="${dayClasses.join(" ")}">
              <div class="calendar-date">${day}</div>
              <div class="calendar-marks">
                ${worked ? `<span><i class="dot attendance"></i>${clockIn || "出勤"}</span>` : ""}
                ${record?.status === "paid_leave" ? `<span><i class="dot leave"></i>有給</span>` : ""}
                ${record?.status === "missing_clock_out" ? `<span><i class="dot warn"></i>退勤漏れ</span>` : ""}
                ${shift ? `<span><i class="dot shift"></i>${escapeHtml(shift.shift)}</span>` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
function renderDailyReport() {
  const editing = state.dailyReports.find((item) => item.id === state.reportEditingId);
  const formDate = editing ? editing.date.replace(/\//g, "-") : currentIsoDate();
  return `
    <section class="grid cols-2">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>${editing ? "日報編集" : "日報作成"}</h2>
            <p>業務内容と次回予定を記録します</p>
          </div>
          ${editing ? badge("correction_pending", "編集中") : ""}
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label>日付</label>
            <input class="input" type="date" id="report-date" value="${formDate}" />
          </div>
          <div class="form-field">
            <label>件名</label>
            <input class="input" id="report-title" value="${editing ? escapeHtml(editing.title) : ""}" placeholder="例: 顧客フォロー" />
          </div>
        </div>
        <div class="form-field" style="margin-top:14px">
          <label>業務内容</label>
          <textarea class="textarea" id="report-body" placeholder="本日の実施内容">${editing ? escapeHtml(editing.body) : ""}</textarea>
        </div>
        <div class="form-field" style="margin-top:14px">
          <label>次回予定</label>
          <textarea class="textarea" id="report-next" placeholder="明日以降の予定">${editing ? escapeHtml(editing.next) : ""}</textarea>
        </div>
        <div class="field-row" style="margin-top:16px">
          <button class="button primary" data-save-report>${icon("check")}${editing ? "更新する" : "作成する"}</button>
          ${editing ? `<button class="button neutral" data-cancel-report>${icon("close")}キャンセル</button>` : ""}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>日報一覧</h2>
            <p>作成済みの日報を編集または削除できます</p>
          </div>
          ${badge("normal", `${state.dailyReports.length}件`)}
        </div>
        <div class="report-list">
          ${state.dailyReports.length ? state.dailyReports.map(renderDailyReportItem).join("") : '<div class="empty">日報はまだありません</div>'}
        </div>
      </div>
    </section>
  `;
}
function renderDailyReportItem(report) {
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(report.title)}</div>
          <div class="item-meta">${escapeHtml(report.date)}</div>
        </div>
        <div class="field-row">
          <button class="button neutral" data-edit-report="${report.id}">${icon("edit")}編集</button>
          <button class="button danger" data-delete-report="${report.id}">${icon("trash")}削除</button>
        </div>
      </div>
      <div class="item-meta">${escapeHtml(report.body)}</div>
      <div class="item-meta">次回: ${escapeHtml(report.next)}</div>
    </article>
  `;
}
function renderMonthlyReport() {
  const workDays = state.history.filter(isAttendanceDay).length;
  const pendingShift = state.shiftRequests.filter((item) => item.status === "shift_pending").length;
  return `
    <section class="grid cols-3">
      <article class="card stat-card ok"><div><div class="stat-label">出勤日</div><div class="stat-value">${workDays}日</div></div><div class="stat-note">2026年7月</div></article>
      <article class="card stat-card primary"><div><div class="stat-label">勤務時間</div><div class="stat-value">126:40</div></div><div class="stat-note">残業 6:40</div></article>
      <article class="card stat-card warn"><div><div class="stat-label">申請中</div><div class="stat-value">${pendingShift}件</div></div><div class="stat-note">シフト申請の処理待ち</div></article>
    </section>
  `;
}
function renderMonthlyClose() {
  const rows = [
    { department: "営業部", missing: 2, pending: 1, closed: false },
    { department: "開発部", missing: 1, pending: 1, closed: false },
    { department: "管理部", missing: 0, pending: 0, closed: true }
  ];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>2026年7月 締め処理</h2>
          <p>未打刻と未承認申請を確認して月次確定します</p>
        </div>
        <button class="button primary" data-action="close-month">${icon("check")}一括締め</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>部署</th><th>未打刻</th><th>未承認</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr class="${row.missing || row.pending ? "row-alert" : ""}">
                <td><strong>${row.department}</strong></td>
                <td>${row.missing}件</td>
                <td>${row.pending}件</td>
                <td>${row.closed ? badge("normal", "締め済み") : badge("shift_pending", "確認中")}</td>
                <td><button class="button neutral" data-action="close-month">締める</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
