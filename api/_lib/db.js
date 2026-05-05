const mysql = require("mysql2/promise");
const { URL } = require("url");

let pool;

const RECOVERABLE_CONNECTION_ERROR_CODES = new Set([
  "PROTOCOL_CONNECTION_LOST",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "EPIPE",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
]);

const createConfigError = (message) => {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = "DB_CONFIG_ERROR";
  return error;
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isRecoverableConnectionError = (error) =>
  RECOVERABLE_CONNECTION_ERROR_CODES.has(error?.code);

const shouldUseSsl = () =>
  process.env.MYSQL_SSL === "true" || process.env.RAILWAY_MYSQL_SSL === "true";

const buildConnectionConfig = () => {
  const connectionUri =
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_PRIVATE_URL ||
    process.env.RAILWAY_MYSQL_URL ||
    "";

  if (connectionUri) {
    const parsedUri = new URL(connectionUri);

    return {
      host: parsedUri.hostname,
      port: parseNumber(parsedUri.port, 3306),
      user: decodeURIComponent(parsedUri.username),
      password: decodeURIComponent(parsedUri.password),
      database: parsedUri.pathname.replace(/^\//, ""),
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    };
  }

  const host = process.env.MYSQLHOST || process.env.RAILWAY_MYSQL_HOST || process.env.DB_HOST;
  const port = parseNumber(
    process.env.MYSQLPORT || process.env.RAILWAY_MYSQL_PORT || process.env.DB_PORT,
    3306
  );
  const user = process.env.MYSQLUSER || process.env.RAILWAY_MYSQL_USER || process.env.DB_USER;
  const password =
    process.env.MYSQLPASSWORD || process.env.RAILWAY_MYSQL_PASSWORD || process.env.DB_PASSWORD || "";
  const database =
    process.env.MYSQLDATABASE || process.env.RAILWAY_MYSQL_DATABASE || process.env.DB_NAME;

  if (!host || !user || !database) {
    throw createConfigError(
      "Railway MySQL environment variables are missing. Add DATABASE_URL or MYSQLHOST/MYSQLUSER/MYSQLDATABASE before using API auth."
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  };
};

const getPool = () => {
  if (!pool) {
    const connectionConfig = buildConnectionConfig();
    pool = mysql.createPool({
      ...connectionConfig,
      waitForConnections: true,
      connectionLimit: parseNumber(process.env.MYSQL_CONNECTION_LIMIT, 10),
      maxIdle: parseNumber(process.env.MYSQL_MAX_IDLE, 10),
      idleTimeout: parseNumber(process.env.MYSQL_IDLE_TIMEOUT_MS, 60000),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: parseNumber(process.env.MYSQL_CONNECT_TIMEOUT_MS, 10000),
      queueLimit: 0,
    });
  }

  return pool;
};

const resetPool = async () => {
  if (!pool) {
    return;
  }

  const currentPool = pool;
  pool = null;

  try {
    await currentPool.end();
  } catch (error) {
    // Ignore close errors while rebuilding the pool after fatal socket issues.
  }
};

const getValidatedConnection = async (attempt = 0) => {
  let connection;

  try {
    connection = await getPool().getConnection();
    await connection.ping();
    return connection;
  } catch (error) {
    if (connection) {
      try {
        connection.destroy();
      } catch (destroyError) {
        // Ignore destroy errors while recovering the connection.
      }
    }

    if (isRecoverableConnectionError(error) && attempt === 0) {
      await resetPool();
      return getValidatedConnection(attempt + 1);
    }

    throw error;
  }
};

const query = async (sql, params = []) => {
  const connection = await getValidatedConnection();

  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    connection.release();
  }
};

const withTransaction = async (callback, attempt = 0) => {
  const connection = await getValidatedConnection(attempt);
  let shouldRelease = true;

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      if (!isRecoverableConnectionError(rollbackError)) {
        throw rollbackError;
      }
    }

    if (isRecoverableConnectionError(error) && attempt === 0) {
      shouldRelease = false;
      try {
        connection.destroy();
      } catch (destroyError) {
        // Ignore destroy errors while rebuilding the pool.
      }
      await resetPool();
      return withTransaction(callback, attempt + 1);
    }

    throw error;
  } finally {
    if (shouldRelease) {
      connection.release();
    }
  }
};

module.exports = {
  getPool,
  query,
  withTransaction,
};
