import { body, param, validationResult } from "express-validator";

export const adminProductValidate = [
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is a required field")
    .isString()
    .withMessage("Invalid description"),
  body("price")
    .trim()
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Invalid price"),
  body("stk_quantity")
    .trim()
    .notEmpty()
    .withMessage("Quantity is required")
    .isNumeric()
    .withMessage("Invalid quantity"),
];

export const adminUpdateProductValidate = [
  param("id")
    .trim()
    .isInt({ min: 1 }) //check valid integer
    .withMessage("Invalid ID "),
  body("price")
    .trim()
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Invalid price"),
  body("quantity")
    .trim()
    .notEmpty()
    .withMessage("Quantity is required")
    .isNumeric()
    .withMessage("Invalid quantity"),
];

export const adminDeleteProductValidate = [
  param("id")
    .trim()
    .isInt({ min: 1 }) //check valid integer
    .withMessage("Invalid ID "),
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
