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

//for the update route at least one need to be provided
const allowedFields = ["price", "stock_quantity ", "is_active"];

const requiredUpdateField = body()
  .isObject()
  .custom((value) => {
    return allowedFields.some((field) => {
      //returns true immediately of one is true
      // and stops iterating thorugh the array
      //at least one is true
      Object.hasOwn(value, field); //check whether each property has a value
    });
  })
  .withMessage("At least one product fiels must be provided");

//set optional
export const adminUpdateProductValidate = [
  param("id")
    .trim()
    .isInt({ min: 1 }) //check valid integer
    .withMessage("Invalid ID "),
  requiredUpdateField,

  body("price")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Invalid price"),
  body("quantity")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Invalid quantity"),
  body("is_active") //handles null so cannot set null, as not boolean
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product status is required")
    .isBoolean({ strict: true }) //strictly enforce boolean true or false not string
    .withMessage("Invalid product status"),
];

export const adminDeleteProductValidate = [
  param("id")
    .trim()
    .isInt({ min: 1 }) //check valid integer
    .withMessage("Invalid product ID"),
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
