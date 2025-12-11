async function recordFormSubmission(form_name = null, form_data = {}) {
  const url = "https://trigger-2gb-616502391258.us-central1.run.app";
  const action = "site_form";

  // ✅ Normalize and validate
  if (!form_name || typeof form_name !== "string" || form_name.trim() === "") {
    console.warn("⚠️ Form submission skipped: invalid or missing form_name.");
    return { ok: false, skipped: true, reason: "invalid_form_name" };
  }

  if (!form_data || typeof form_data !== "object" || Array.isArray(form_data)) {
    console.warn("⚠️ Form submission skipped: form_data must be an object.");
    return { ok: false, skipped: true, reason: "invalid_form_data" };
  }

  const args = { form_name, form_data };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, args })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed (${res.status}): ${text}`);
    }

    const data = await res.json().catch(() => ({}));
    console.log("✅ Trigger success:", data);
    return data;
  } catch (err) {
    console.error("❌ Trigger failed:", err.message);
    return { ok: false, error: err.message };
  }
}
