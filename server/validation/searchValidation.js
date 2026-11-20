import { query, param, validationResult } from "express-validator";

const productSearch = [
  query("q") //this is a required query paramter
    .trim()
    .notEmpty()
    .withMessage("Search term is required")
    .isString()
    .withMessage("Invalid search term"),

  //declare optional, receive as strings and transforms to int
  //safely transforms
  //isInt work for both string and number typee
  //accepts valid integer strings but not "abc" strings
  //more flexibility
  query("page").optional().trim().isInt().withMessage("Invalid page").toInt(),
  //declare optional, string to int
  query("limit")
    .optional()
    .trim()
    //this method works for both string and number
    .isInt({ min: 10, max: 100 })
    .withMessage("Product Items per page should be within 10 and 100")
    .toInt(),
];

const productSpecific = [
  param("id").trim().notEmpty().withMessage("ProductID is required"),
];


function inputErrhandle(req, res, next) {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    res.status(400).send({
      error: error.array(),
    });
  }
  next();
}

export {productSearch,productSpecific,inputErrhandle}
