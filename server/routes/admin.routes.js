import { Router } from "express";
import requireAdmin from "../middleware/requireAdmin";
import JWTAuth from "../middleware/jwtmiddleware";
import {
  adminProductValidate,
  adminUpdateProductValidate,
  adminDeleteProductValidate,
  inputErrhandle,
} from "../../validation/admin_validation";
import db from "../database/postgres";
const router = Router();

//ADMINSTRATIVE operations

//admin paths
//route in here all require admin access
//verify token like anyone else(AuthN), then check role (AuthZ)
//express json parses incoming json to js types
router.post(
  "/admin/products",
  JWTAuth,
  requireAdmin,
  adminProductValidate, //charactersitics of products
  inputErrhandle,
  async (req, res) => {
    //error handling of input validtion
    //extract
    const { desc, price, stk_quantity } = req.body;

    //build an obj
    const productDetails = {
      pDesc: desc,
      pPrice: price,
      pQuantity: stk_quantity,
    };

    //insertion into database
    //return a response confirm resource creation

    const result = await db.one(
      "INSERT INTO products(description, price, stock_quantity) VALUES ($1,$2,$3) RETURNING product_id, description,price, created_at,stock_quantity",
      [productDetails.pDesc, productDetails.pPrice, productDetails.pQuantity],
    );

    //return a response confirm resource creation for admin
    return res.status(201).send({
      id: result.product_id,
      description: result.description,
      time_create: result.created_at,
      quantity: result.stock_quantity,
    });
  },
);

//changr specific fields not all of em
//for now change price,change stock,maybe
//adminstrator updates inventory and performs stock correction and price changes, but not when the customers is ordering

router.patch(
  "/admin/products/:id",
  JWTAuth,
  requireAdmin,
  adminUpdateProductValidate,
  inputErrhandle,
  async (req, res) => {
    //change specific attributes of a procuct
    const id = req.params.id; //parse as strings
    const { price, quantity } = req.body;

    const productUpdate = {
      pPrice: price,
      pQuantity: quantity,
    };

    //there should be changes to quantity and price, like should i add
    //or just overwrite the value like this
    //for now just reassignment
    //the stock will update if a there is a user order, or cancell incremetn and decrement

    const updated = await db.oneOrNone(
      "UPDATE products SET price = $1,stock_quantity = $2 WHERE product_id = $3 RETURNING product_id, description, price, updated_at, stock_quantity",
      [productUpdate.pPrice, productUpdate.pQuantity, id],
    );

    //product not found
    if (updated === null) {
      return res.status(404).send({
        error: "Product not found",
      });
    }

    //confirm update suvvessful
    return res.status(200).send({
      id: updated.product_id,
      description: updated.description,
      price: updated.price,
      timeUpdated: updated.updated_at,
    });
  },
);

//delete entire products
//admin delete products, products deleted
//soft deletion for now , add is active to products to update the status of products

router.delete(
  "/admin/products/:id",
  JWTAuth,
  requireAdmin,
  adminDeleteProductValidate,
  inputErrhandle, //before controllers logic
  async (req, res) => {
    const id = req.params.id;

    //delete operation
    //enforece delete constraint  as cart items and order items are referencing it
    //cause if one product is deleted then the rrference is gone
    const deleted = await db.result(
      "UPDATE products SET is_active = FALSE WHERE id = $1",
      id,
    );

    //no update performed
    if (deleted.rowCount === 0) {
      return res.status(404).send({
        error: "Not found",
      });
    }

    return res.status(204).send({
      message: "Successful deletion",
    });
  },
);

export default adminRouter;
