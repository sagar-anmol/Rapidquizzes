const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const { loadProjectEnv } = require("./lib/env");

async function main() {
  loadProjectEnv();
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: node scripts/pipeline/create-admin.js <email> <password>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log(`User ${email} already exists; promoting existing account.`);
      const list = await client.auth.admin.listUsers();
      const existing = list.data.users.find((u) => u.email === email);
      if (!existing) {
        console.error("Could not find existing user.");
        process.exit(1);
      }
      await promote(client, existing.id);
      return;
    }
    console.error("createUser failed:", error.message);
    process.exit(1);
  }

  await promote(client, data.user.id);
}

async function promote(client, userId) {
  const { error } = await client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);

  if (error) {
    console.error("Profile promotion failed:", error.message);
    process.exit(1);
  }

  const { data: profile } = await client
    .from("profiles")
    .select("email, role")
    .eq("id", userId)
    .single();

  console.log(`Admin ready: ${profile.email} role=${profile.role}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
