import Session from "../models/Session.js";

const validateSession = async (req, res, next) => {
  const sessionToken = req.headers["x-session-token"];
  const tableId = req.body.tableId || req.query.tableId;

  if (!sessionToken || !tableId) {
    return res
      .status(401)
      .json({ error: "Session token and table ID required." });
  }

  const session = await Session.findOne({
    sessionToken,
    tableId,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  next();
};

export default validateSession;
