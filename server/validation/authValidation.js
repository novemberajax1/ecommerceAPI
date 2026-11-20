import { body, validateResult } from "express-validator";
import { sign } from "jsonwebtoken";

export const crendentialValidate = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email cannot be empty")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password").trim().notEmpty().withMessage("Password cannot be empty"),
];

export function inputErrhandle(req, res, next) {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    res.status(400).send({
      error: error.array(),
    });
  }
  next();
}
