import { Router } from "express";
import {
  productSearch,
  productSpecific,
  inputErrhandle,
} from "../validation/searchValidation.js";
import db from "../database/postgres.js";

const router = Router();
//these routes are public anyone can access it

//get all products , searching for all products
//use req.query
//validate query
//query kv pairs
//use LIKE in db , searching for a wide category
//anyone can access it user and admin, everyone
//add pagniation later
//allow as strings check empty and then convery to numbers
//http://localhost:3000/products/q?
//add start later
router.get("/search", productSearch, inputErrhandle, async (req, res) => {
  //handle input validation error
  const errorRes = validationResult(req);
  if (!errorRes.isEmpty()) {
    return res.status(400).send({
      error: errorRes.array(),
    });
  }

  //item to search for, query parameter
  //how many page and number of results per page
  //default values are set as page and limit are optional
  const { q, page = 1, limit = 10 } = req.query;

  //calculate the offset, offset calculated from the server
  //how much results db should skip before returning results
  //as the user proceeds to a different page, the offset gets bigger
  // so first page, 1-1 * 10 = 0, 0 products skipped and return product 1 to 10
  //then the second, 2 - 1 * 10 , 10 products skipped and return product 11 to 20
  //page - 1 to skip the previous page results, as it goes it gets bigger continously
  //each new page skips 10 results
  //determines how much to skep as page progressess
  const offset = (page - 1) * limit;

  //search by name with a specific pattern, widen the search scope
  //any sequence of charactes can appear before or after the seach term
  //showing active products and out of stock items as well, everything
  //product active and avaialablity are differnt things
  //USE LILMIT and OFFSET for pagination results
  //order by id in ascending order
  //if some products are updated, postgres does not care about ordering
  const products = db.any(
    `SELECT product_id, 
      description,
      price, 
      stock_quantity,
      FROM products
      WHERE description ILIKE $1 AND is_active = TRUE
      ORDER BY product_id 
      LIMIT $2 
      OFFSET $3 `, //how much to skip
    [`%${q}%`, limit, offset],
  );

  //need to determine if the user search term does not
  //correspond to the products in the databse
  //then we show not found or simply does not exists
  //this is not about availability or stock
  if (products.length === 0) {
    return res.status(404).send({
      error: `No search results for ${q}`,
      products: [], //signify that no items were found
    });
  }

  //expect an array of rows
  const result = products.map((product) => ({
    id: product.id,
    name: product.description,
    unit_price: product.price,
    stock: product.stock_quantity,
  }));

  return res.status(200).send({
    result,
  });
});

//this is publicly accessible

//specific
router.get(
  "/products/:id",
  productSpecific,
  inputErrhandle,
  async (req, res) => {
    const errorResult = validationResult(req);
    if (!errorResult.isEmpty()) {
      return res.status(400).send({
        error: errors.array(),
      });
    }

    //postgrs can infer the approproate type in the column
    //postgres can apply it automatically in supported contexts
    const productid = req.params.id;

    //the product id column is a 64 bit BIGINT
    const findProduct = db.oneOrNone(
      "SELECT product_id, description, price, stock_quantity WHERE product_id = $1 AND is_active = TRUE",
      productid,
    );

    if (!findProduct) {
      return res.status(404).send({
        error: "Product not found",
      });
    }

    return res.status(200).send({
      id: findProduct.product_id,
      name: findProduct.description,
      price: findProduct.price,
      stock: findProduct.stock_quantity,
    });
  },
);

export default productRouter;
