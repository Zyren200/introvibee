const ensureMethod = (req, res, methods) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", methods.join(", "));
    res.end();
    return false;
  }

  if (!methods.includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", methods.join(", "));
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: `Method not allowed. Use ${methods.join(", ")}.` }));
    return false;
  }

  return true;
};

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const parseJsonBody = (req) =>
  new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }

    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        error.statusCode = 400;
        error.message = "Invalid JSON body.";
        reject(error);
      }
    });

    req.on("error", reject);
  });

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const DB_UNAVAILABLE_ERROR_CODES = new Set([
  "DB_CONFIG_ERROR",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "EAI_AGAIN",
  "PROTOCOL_CONNECTION_LOST",
]);

const readBearerToken = (req) => {
  const authorizationHeader = req.headers.authorization || req.headers.Authorization;

  if (typeof authorizationHeader === "string" && authorizationHeader.startsWith("Bearer ")) {
    return authorizationHeader.slice(7).trim();
  }

  const tokenHeader = req.headers["x-session-token"];
  return typeof tokenHeader === "string" ? tokenHeader.trim() : null;
};

const handleApiError = (res, error) => {
  console.error(error);

  const isDatabaseUnavailable = DB_UNAVAILABLE_ERROR_CODES.has(error?.code);
  const statusCode = error?.statusCode || (isDatabaseUnavailable ? 503 : 500);
  const message =
    statusCode >= 500
      ? isDatabaseUnavailable
        ? "IntroVibe database is unavailable. Check the Railway MySQL connection and try again."
        : "Internal server error."
      : error.message;
  sendJson(res, statusCode, { error: message });
};

module.exports = {
  createHttpError,
  ensureMethod,
  handleApiError,
  parseJsonBody,
  readBearerToken,
  sendJson,
};
