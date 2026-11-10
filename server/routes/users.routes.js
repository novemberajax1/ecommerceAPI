import { Router } from "express";
import JWTAuth from "../middleware/jwtmiddleware";
import db from "../database/postgres";
const router = Router();

//authorization middleware verifies the token, check role admin or user
//check role using req.auth.role, extract from sql

//user routes requie auth middleware

//get the entire cart and items, everyhting, index 2 tables
router.get("/cart", JWTAuth, async (req, res) => {
  //join tables
  const user_id = req.auth.userID; //need the id to identify the user cart ,paylod inside the JWT

  //need cart and cart items need produce names
  const cart = db.any(
    `SELECT 
    cart.cart_id,
    cart.createdat,
    cart_items.id,
    cart_items.product_id,
    cart_items.quantity,
    cart_items.created_at,
    product.price, 
    product.description, 
    product.is_active FROM cart 
    JOIN cart_items ON cart_items.cart_id = cart.cart_id 
    JOIN products ON products.product_id = cart_items.product_id
    WHERE cart.user_id = $1`,
    user_id,
  );
});

//add items inside the cart
//extact body
router.post("/cart/items", JWTAuth, async (req, res) => {});

//remove items in the cart by id
//params
router.delete("/cart/items/:id", JWTAuth, async (req, res) => {});

//cart checkout, index into orders database
router.post("/cart/checkout", JWTAuth, async (req, res) => {});

//intiate payment, index into payment table
router.post("/orders/:id/pay", JWTAuth, async (req, res) => {});
//get all orders
router.get("/orders", JWTAuth, async (req, res) => {});

//get one order
router.get("/orders/:id", JWTAuth, async (req, res) => {});

export default usersRouter;
