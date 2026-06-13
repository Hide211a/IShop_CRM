import rateLimit from "express-rate-limit";

/** Brute-force protection for login (skipped in test). */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  handler: (_req, res) => {
    res.status(429).json({ message: "Забагато спроб входу. Спробуйте пізніше." });
  },
});
