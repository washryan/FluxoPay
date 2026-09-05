type Fields = Record<string, unknown>;

function sanitized(fields: Fields = {}) {
  const result: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (/token|secret|service.?role|payload|message/i.test(key)) continue;
    if (/user.?id/i.test(key) && value != null) result[key] = String(value).slice(0, 8);
    else if (value instanceof Error) result[key] = value.name;
    else result[key] = value;
  }
  return result;
}

function write(level: "info" | "warn" | "error", event: string, fields?: Fields) {
  const line = JSON.stringify({ level, event, ...sanitized(fields), at: new Date().toISOString() });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
