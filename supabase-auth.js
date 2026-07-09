(function () {
  const config = window.SUPABASE_CONFIG || {};
  const hasConfig = Boolean(
    config.url &&
    config.anonKey &&
    config.anonKey !== "YOUR_SUPABASE_ANON_KEY"
  );
  const hasLibrary = Boolean(window.supabase);
  const client = hasConfig && hasLibrary
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

  function initIssue() {
    if (!hasConfig) return "config";
    if (!hasLibrary) return "library";
    return null;
  }

  function initErrorMessage() {
    if (!hasConfig) return "supabase-config.js にSupabaseのURLとPublishable key（anon key）を設定してください。";
    if (!hasLibrary) return "supabase-jsライブラリを読み込めませんでした。プロジェクト直下で npm install を実行し、ページを再読み込みしてください。";
    return "";
  }

  function normalizeRole(role) {
    return role === "admin" ? "admin" : "member";
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function redirectUrl() {
    return window.location.origin + window.location.pathname;
  }

  function profileFromUser(user) {
    const metadata = user.user_metadata || {};
    const email = normalizeEmail(user.email);
    return {
      id: user.id,
      email,
      full_name: metadata.full_name || email.split("@")[0] || "ユーザー",
      role: normalizeRole(metadata.role),
      department: metadata.department || null
    };
  }

  async function ensureProfile(user) {
    const fallback = profileFromUser(user);
    const { data: existing, error: selectError } = await client
      .from("profiles")
      .select("id,email,full_name,role,department")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) return existing;
    if (selectError && selectError.code !== "PGRST116") throw selectError;

    const { data, error } = await client
      .from("profiles")
      .upsert(fallback, { onConflict: "id" })
      .select("id,email,full_name,role,department")
      .single();

    if (error) throw error;
    return data;
  }

  async function getSessionProfile() {
    if (!client) return null;
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user) return null;
    return ensureProfile(sessionData.session.user);
  }

  async function signIn(email, password) {
    if (!client) throw new Error(initErrorMessage() || "Supabaseクライアントを初期化できませんでした。");
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizeEmail(email),
      password
    });
    if (error) throw error;
    if (!data.user) throw new Error("ログインユーザーを取得できませんでした。");
    return ensureProfile(data.user);
  }

  async function signUp(email, password) {
    if (!client) throw new Error(initErrorMessage() || "Supabaseクライアントを初期化できませんでした。");
    const { data, error } = await client.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        emailRedirectTo: redirectUrl(),
        data: {
          role: "member"
        }
      }
    });

    if (error) throw error;
    if (data.session?.user) {
      return {
        profile: await ensureProfile(data.session.user),
        needsConfirmation: false
      };
    }
    return {
      profile: null,
      needsConfirmation: Boolean(data.user)
    };
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  const attendanceColumns = [
    "id",
    "user_id",
    "work_date",
    "work_type",
    "clock_in",
    "clock_out",
    "break_minutes",
    "breaks",
    "status",
    "note",
    "created_at",
    "updated_at"
  ].join(",");

  async function getAttendanceByDate(userId, workDate) {
    if (!client) return null;
    const { data, error } = await client
      .from("attendances")
      .select(attendanceColumns)
      .eq("user_id", userId)
      .eq("work_date", workDate)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function createAttendance(payload) {
    if (!client) throw new Error(initErrorMessage() || "Supabaseクライアントを初期化できませんでした。");
    const { data, error } = await client
      .from("attendances")
      .insert(payload)
      .select(attendanceColumns)
      .single();

    if (error) throw error;
    return data;
  }

  async function updateAttendance(id, payload) {
    if (!client) throw new Error(initErrorMessage() || "Supabaseクライアントを初期化できませんでした。");
    const { data, error } = await client
      .from("attendances")
      .update(payload)
      .eq("id", id)
      .select(attendanceColumns)
      .single();

    if (error) throw error;
    return data;
  }

  const shiftColumns = [
    "id",
    "user_id",
    "request_date",
    "shift_type",
    "start_time",
    "end_time",
    "reason",
    "status",
    "reviewed_by",
    "reviewed_at",
    "submitted_at",
    "created_at",
    "updated_at"
  ].join(",");

  async function listShifts() {
    if (!client) return [];
    // RLS により member は自分のシフトのみ、admin は全員のシフトが返る
    const { data, error } = await client
      .from("shifts")
      .select(shiftColumns)
      .order("request_date", { ascending: false })
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 管理者用: 申請者のプロフィールを結合して全シフトを取得（RLS で admin は全件取得可）
  async function listShiftsForAdmin() {
    if (!client) return [];
    const { data, error } = await client
      .from("shifts")
      .select(`${shiftColumns},applicant:profiles!shifts_user_id_fkey(id,full_name,email,department)`)
      .order("request_date", { ascending: false })
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function createShift(payload) {
    if (!client) throw new Error(initErrorMessage() || "Supabaseクライアントを初期化できませんでした。");
    const { data, error } = await client
      .from("shifts")
      .insert(payload)
      .select(shiftColumns)
      .single();

    if (error) throw error;
    return data;
  }

  async function updateShift(id, payload) {
    if (!client) throw new Error(initErrorMessage() || "Supabaseクライアントを初期化できませんでした。");
    const { data, error } = await client
      .from("shifts")
      .update(payload)
      .eq("id", id)
      .select(shiftColumns)
      .single();

    if (error) throw error;
    return data;
  }

  async function deleteShift(id) {
    if (!client) throw new Error(initErrorMessage() || "Supabaseクライアントを初期化できませんでした。");
    const { error } = await client
      .from("shifts")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  function onAuthStateChange(callback) {
    if (!client) return { unsubscribe() {} };
    const { data } = client.auth.onAuthStateChange(callback);
    return data.subscription;
  }

  window.supabaseAuth = {
    isConfigured: () => Boolean(client),
    initIssue,
    initErrorMessage,
    getSessionProfile,
    signIn,
    signUp,
    signOut,
    getAttendanceByDate,
    createAttendance,
    updateAttendance,
    listShifts,
    listShiftsForAdmin,
    createShift,
    updateShift,
    deleteShift,
    onAuthStateChange
  };
})();
