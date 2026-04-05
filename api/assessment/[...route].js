const crypto = require("crypto");
const { withTransaction } = require("../_lib/db");
const { requireSession } = require("../_lib/auth");
const { STARTING_PUZZLE } = require("../_lib/sudoku");
const { createHttpError, ensureMethod, handleApiError, parseJsonBody, sendJson } = require("../_lib/http");
const { mapAnswerToPersonality, resolvePersonalityFromAnswers } = require("../_lib/personality");
const { getUserById, listUsers, runQuery } = require("../_lib/users");

const getAssessmentRoute = (req) => {
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

const handleComplete = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const body = await parseJsonBody(req);
  const rawAnswers = Array.isArray(body?.answers) ? body.answers : [];
  const answers = rawAnswers.map((answer) => (answer || "").toString().trim().toUpperCase());

  if (!answers.length) {
    throw createHttpError("Assessment answers are required.", 400);
  }

  const { user } = await withTransaction(async (connection) => {
    const session = await requireSession(req, connection);
    const questionRows = await runQuery(
      connection,
      `SELECT id, display_order
       FROM personality_questions
       WHERE is_active = 1
       ORDER BY display_order ASC`
    );

    if (answers.length !== questionRows.length) {
      throw createHttpError(`Expected ${questionRows.length} answers for the IntroVibe assessment.`, 400);
    }

    const invalidAnswer = answers.find((answer) => !["A", "B", "C"].includes(answer));
    if (invalidAnswer) {
      throw createHttpError("Each assessment answer must be A, B, or C.", 400);
    }

    const finalPersonality = resolvePersonalityFromAnswers(
      answers,
      session.user.predictedPersonality || "Ambivert"
    );
    const assessmentId = crypto.randomUUID();

    await runQuery(
      connection,
      `INSERT INTO personality_assessments (
         id,
         user_id,
         predicted_personality,
         final_personality,
         total_questions
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        assessmentId,
        session.user.id,
        session.user.predictedPersonality || null,
        finalPersonality,
        questionRows.length,
      ]
    );

    for (let index = 0; index < questionRows.length; index += 1) {
      await runQuery(
        connection,
        `INSERT INTO personality_assessment_answers (
           assessment_id,
           question_id,
           answer_code,
           mapped_personality
         )
         VALUES (?, ?, ?, ?)`,
        [assessmentId, questionRows[index].id, answers[index], mapAnswerToPersonality(answers[index])]
      );
    }

    await runQuery(
      connection,
      `UPDATE users
       SET personality_type = ?,
           assessment_completed = 1,
           sudoku_completed = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [finalPersonality, finalPersonality === "Introvert" ? 0 : 1, session.user.id]
    );

    await runQuery(
      connection,
      `INSERT INTO sudoku_progress (user_id, status)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         completed_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [session.user.id, finalPersonality === "Introvert" ? "not_started" : "completed"]
    );

    const updatedUser = await getUserById(session.user.id, connection);
    return { user: updatedUser };
  });

  const users = await listUsers();

  sendJson(res, 200, {
    mode: "railway-api",
    user,
    users,
  });
};

const handleReset = async (req, res) => {
  if (!ensureMethod(req, res, ["POST"])) {
    return;
  }

  const { user } = await withTransaction(async (connection) => {
    const session = await requireSession(req, connection);
    const userId = session.user.id;

    await runQuery(
      connection,
      `DELETE paa
       FROM personality_assessment_answers paa
       INNER JOIN personality_assessments pa ON pa.id = paa.assessment_id
       WHERE pa.user_id = ?`,
      [userId]
    );

    await runQuery(
      connection,
      `DELETE FROM personality_assessments
       WHERE user_id = ?`,
      [userId]
    );

    await runQuery(
      connection,
      `CREATE TABLE IF NOT EXISTS match_recommendations (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         user_id CHAR(36) NOT NULL,
         matched_user_id CHAR(36) NOT NULL,
         compatibility_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
         shared_interest_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
         same_personality TINYINT(1) NOT NULL DEFAULT 0,
         status ENUM('suggested', 'saved', 'messaged', 'dismissed') NOT NULL DEFAULT 'suggested',
         generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY uq_match_recommendations_pair (user_id, matched_user_id),
         KEY idx_match_recommendations_user_status (user_id, status)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    );

    await runQuery(
      connection,
      `DELETE FROM match_recommendations
       WHERE user_id = ?
          OR matched_user_id = ?`,
      [userId, userId]
    );

    await runQuery(
      connection,
      `UPDATE users
       SET personality_type = NULL,
           assessment_completed = 0,
           sudoku_completed = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [userId]
    );

    await runQuery(
      connection,
      `INSERT INTO sudoku_progress (
         user_id,
         status,
         board_state,
         moves_count,
         started_at,
         completed_at
       )
       VALUES (?, 'not_started', ?, 0, NULL, NULL)
       ON DUPLICATE KEY UPDATE
         status = 'not_started',
         board_state = VALUES(board_state),
         moves_count = 0,
         started_at = NULL,
         completed_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, JSON.stringify(STARTING_PUZZLE)]
    );

    const updatedUser = await getUserById(userId, connection);
    return { user: updatedUser };
  });

  const users = await listUsers();

  sendJson(res, 200, {
    mode: "railway-api",
    user,
    users,
  });
};

module.exports = async (req, res) => {
  try {
    const route = getAssessmentRoute(req);

    if (route === "complete") {
      await handleComplete(req, res);
      return;
    }

    if (route === "reset") {
      await handleReset(req, res);
      return;
    }

    throw createHttpError("Assessment endpoint not found.", 404);
  } catch (error) {
    handleApiError(res, error);
  }
};
