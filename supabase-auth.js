(function () {
  const config = window.SUPABASE_CONFIG || {};
  const hasConfig = Boolean(
    config.url &&
    config.anonKey &&
    config.anonKey !== "YOUR_SUPABASE_ANON_KEY"
  );
  const client = hasConfig && window.supabase
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

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
    if (!client) throw new Error("SupabaseのURLまたはanon keyが未設定です。");
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizeEmail(email),
      password
    });
    if (error) throw error;
    if (!data.user) throw new Error("ログインユーザーを取得できませんでした。");
    return ensureProfile(data.user);
  }

  async function signUp(email, password) {
    if (!client) throw new Error("SupabaseのURLまたはanon keyが未設定です。");
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
    if (!client) throw new Error("SupabaseのURLまたはanon keyが未設定です。");
    const { data, error } = await client
      .from("attendances")
      .insert(payload)
      .select(attendanceColumns)
      .single();

    if (error) throw error;
    return data;
  }

  async function updateAttendance(id, payload) {
    if (!client) throw new Error("SupabaseのURLまたはanon keyが未設定です。");
    const { data, error } = await client
      .from("attendances")
      .update(payload)
      .eq("id", id)
      .select(attendanceColumns)
      .single();

    if (error) throw error;
    return data;
  }

  function onAuthStateChange(callback) {
    if (!client) return { unsubscribe() {} };
    const { data } = client.auth.onAuthStateChange(callback);
    return data.subscription;
  }

  window.supabaseAuth = {
    isConfigured: () => Boolean(client),
    getSessionProfile,
    signIn,
    signUp,
    signOut,
    getAttendanceByDate,
    createAttendance,
    updateAttendance,
    onAuthStateChange
  };
})();
