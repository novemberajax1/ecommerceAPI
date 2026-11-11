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

  //Need  the cart and and cart itemms with details
  //the id of the product
  //when the cart was created
  //the id of items in the cart
  //the id of the product itself
  //the quantity of each item added
  //when the cart item was created
  //the price of the product, this is the price when the item is added to the cart, estimate prices
  //the name of the product
  //the status of the cart\
  //calculate the subtotal of each row and add them together,
  //SUM() is the sum of expressions across all input values
  //return an array of rows
  //window functio without collopasing the rows, there is a cart total for each item

  //query optimizaitons
  //return buyer identiy as well maybe
  //LEFT JOIN preservres every row from the left table , even when no row in the right table
  //satisfies the JOIN condition

  const cartDetails = await db.any(
    `SELECT 
    cart.cart_id AS cID,
    cart.createdat AS cCreatedat, 
    cart_items.id AS ciID, 
    cart_items.product_id AS ciPID,  
    cart_items.quantity AS ciQ,
    cart_items.created_at ciCreatedat, 
    cart_items.price AS pPrice,  
    cart_items.description AS pDesc,
    ciQ * pPrice AS itmSubtotal,
    SUM(ciQ * p.Price) OVER() AS cSubtotal
    FROM cart
    LEFT JOIN cart_items ON cart_items.cart_id = cart.cart_id 
    WHERE cart.user_id = $1`,
    user_id,
  );
  //expose info only the clien needs

  //handle edge case for cart do not exists and cart empty

  //cart do not exists
  if (cartDetails.length === 0) {
    return res.status(404).send({
      items: [],
      subtotal: "0.00",
      cart_id: null,
    });
  }

  //empty cart, cart exists but emmpty values , postgrs poopulate the right table
  // with null because no mathching value exists
  if (cartDetails[0].ciPID === null) {
    return res.status(200).send({
      cart_id: cartDetails[0].cID,
      items: [],
      subtotal: 0,
    });
  }

  //reflect those relationships in JSON appropriate format
  //one cart per user
  //one cart have many items
  const result = {
    //one cart per user
    cart: {
      //cart info
      id: cartDetails[0].cID, //all items habe the same cart ID
      created_at: cartDetails[0].cCreatedat,
      subtotal: cartDetails[0].eSubtotal,
      //map each item into the array extrat details, apply this format to every item
      //many items for one user
      //msp to an arra
      items: cartDetails
        .filter((cartDetails) => {
          cartDetails.ciPID !== null;
        }) // if the cart is empty , excluding the role with nll
        .map((cartDetails) => ({
          id: cartDetails.ciID,
          product_id: cartDetails.ciPID,
          quantity: cartDetails.ciQ,
          created_at: cartDetails.ciCreatedat,
          price: cartDetails.pPrice,
          name: cartDetails.pDesc,
          subtotal: cartDetails.itmSubtotal, //subtotal for each individual item
        })),
    },
  };

  //return result
  return res.status(200).json({ result });
});

//add items inside the cart
//extact body
//maybe create cart as well
//create the cart when the customer first add an item
//need user info in body , users, inset userid and creat cart, insert cart item table
//add products to the cart
router.post("/cart/items", JWTAuth, async (req, res) => {});

//remove items in the cart by id
//params
router.delete("/cart/items/:id", JWTAuth, async (req, res) => {});

//cart checkout, index into orders database
//check price changes
//final price establish during order creation, the price paid here is where the customer is willing to pay
router.post("/cart/checkout", JWTAuth, async (req, res) => {});

//intiate payment, index into payment table
router.post("/orders/:id/pay", JWTAuth, async (req, res) => {});
//get all orders
router.get("/orders", JWTAuth, async (req, res) => {});

//get one order
router.get("/orders/:id", JWTAuth, async (req, res) => {});

export default usersRouter;
