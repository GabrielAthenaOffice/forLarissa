const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  return lines.reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return env;
    const index = trimmed.indexOf("=");
    if (index === -1) return env;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    env[key] = value;
    return env;
  }, {});
}

const env = loadEnv();

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    EXPO_PUBLIC_SUPABASE_URL:
      env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY:
      env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
