const crypto = require("crypto");
const { withTransaction } = require("../_lib/db");
const { createSession, hashPassword, requireSession, revokeSessionToken, verifyPassword } = require("../_lib/auth");
const { predictPersonalityFromInterests, uniqueInterests } = require("../_lib/personality");
const { createHttpError, ensureMethod, handleApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { getUserById, listUsers, runQuery, syncUserInterests } = require("../_lib/users");

const getAuthRoute = (req) => {
  const routeParam = req?.query?.route;

  if (Array.isArray(routeParam)) {
    return routeParam.filter(Boolean).join("/");
  }

  if (typeof routeParam === "string" && routeParam.trim()) {
    return routeParam.trim();
  }

  const pathname = new URL(req.url || "/", "http://localhost").pathname.replace(/\/+$/, "");
  return pathname
    .split("/")
    .filter(Boolean)
    .slice(2)
    .join("/");
};

const handleRegister = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const username = body?.username?.trim() || "";
  const email = body?.email?.trim() || "";
  const password = body?.password || "";
  const avatarId = Number(body?.avatarId) || 1;
  const interests = uniqueInterests(body?.interests || []);

  if (!username || !email || !password) {
    throw createHttpError("Username, email, and password are required.", 400);
  }

  if (username.length < 3) {
    throw createHttpError("Username must be at least 3 characters.", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError("Please enter a valid email address.", 400);
  }

  if (password.length < 8) {
    throw createHttpError("Password must be at least 8 characters.", 400);
  }

  if (!interests.length) {
    throw createHttpError("Choose at least one interest to build your IntroVibe profile.", 400);
  }

  const { sessionToken, user } = await withTransaction(async (connection) => {
    const existingUsers = await runQuery(
      connection,
      `SELECT username, email
       FROM users
       WHERE deleted_at IS NULL
         AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
       LIMIT 1`,
      [username, email]
    );

    if (existingUsers.length) {
      const existingUser = existingUsers[0];
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        throw createHttpError("That username is already taken.", 409);
      }

      throw createHttpError("That email is already registered.", 409);
    }

    const userId = crypto.randomUUID();
    const predictedPersonality = predictPersonalityFromInterests(interests);
    const passwordHash = await hashPassword(password);

    await runQuery(
      connection,
      `INSERT INTO users (
         id,
         username,
         email,
         password_hash,
         avatar_id,
         predicted_personality,
         presence_status,
         last_active_at
       )
       VALUES (?, ?, ?, ?, ?, ?, 'online', UTC_TIMESTAMP())`,
      [userId, username, email, passwordHash, avatarId, predictedPersonality]
    );

    await syncUserInterests(connection, userId, interests);
    await runQuery(connection, `INSERT INTO sudoku_progress (user_id) VALUES (?)`, [userId]);
    await runQuery(connection, `INSERT INTO user_settings (user_id) VALUES (?)`, [userId]);
    await runQuery(connection, `INSERT INTO user_app_state (user_id) VALUES (?)`, [userId]);

    const nextSessionToken = await createSession(connection, userId);
    const createdUser = await getUserById(userId, connection);

    return {
      sessionToken: nextSessionToken,
      user: createdUser,
    };
  });

  const users = await listUsers();

  sendJson(res, 201, {
    mode: "railway-api",
    sessionToken,
    user,
    users,
  });
};

const handleLogin = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const username = body?.username?.trim() || "";
  const password = body?.password || "";

  if (!username || !password) {
    throw createHttpError("Username and password are required.", 400);
  }

  const { sessionToken, user } = await withTransaction(async (connection) => {
    const rows = await runQuery(
      connection,
      `SELECT id, password_hash
       FROM users
       WHERE deleted_at IS NULL
         AND LOWER(username) = LOWER(?)
       LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      throw createHttpError("Invalid credentials. Please sign up if you are new.", 401);
    }

    const [matchedUser] = rows;
    const passwordIsValid = await verifyPassword(password, matchedUser.password_hash);

    if (!passwordIsValid) {
      throw createHttpError("Invalid credentials. Please sign up if you are new.", 401);
    }

    const nextSessionToken = await createSession(connection, matchedUser.id);
    const nextUser = await getUserById(matchedUser.id, connection);

    return {
      sessionToken: nextSessionToken,
      user: nextUser,
    };
  });

  const users = await listUsers();

  sendJson(res, 200, {
    mode: "railway-api",
    sessionToken,
    user,
    users,
  });
};

const handleMe = async (req, res) => {
  if (!ensureMethod(req, res, ["GET"])) {
    return;
  }

  const session = await requireSession(req);
  const users = await listUsers();

  sendJson(res, 200, {
    mode: "railway-api",
    user: session.user,
    users,
  });
};

const handleLogout = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const authorizationHeader = req.headers.authorization || req.headers.Authorization || "";
  const sessionToken = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : req.headers["x-session-token"] || null;

  await revokeSessionToken(sessionToken);

  sendJson(res, 200, {
    success: true,
    mode: "railway-api",
  });
};

module.exports = async (req, res) => {
  try {
    const route = getAuthRoute(req);

    if (route === "register") {
      await handleRegister(req, res);
      return;
    }

    if (route === "login") {
      await handleLogin(req, res);
      return;
    }

    if (route === "me") {
      await handleMe(req, res);
      return;
    }

    if (route === "logout") {
      await handleLogout(req, res);
      return;
    }

    throw createHttpError("Auth endpoint not found.", 404);
  } catch (error) {
    handleApiError(res, error);
  }
};
