import { body, param, validationResult } from "express-validator";

//add cart
const addCartItems = [
  body("quantity")
    .trim()
    .notEmpty()
    .withMessage("Quantity required")
    .isInt() //check integer strings as well
    .withMessage("Invalid integer")
    .toInt(), //32 bit integer in db

  //no convert, using 64 bit integer in db
  body("pID")
    .trim()
    .notEmpty()
    .withMessage("Product id is required")
    .isInt() //check integer strings as well
    .withMessage("Invalid product ID"),
];

//removal of items
//check cart items id
//the cart item is 64 bit BIGINT

const removeItems = [
  param("cid")
    .trim()
    .notEmpty()
    .withMessage("Cart item id required")
    .toInt()
    .withMessage("Invalid cart item id"),
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

export { addCartItems, removeItems, inputErrhandle };
