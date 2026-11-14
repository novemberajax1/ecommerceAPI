import { Router } from "express";
import JWTAuth from "../middleware/jwtmiddleware";
import db from "../database/postgres";
import { body, check, validateResult } from "express-validator";
const router = Router();

//authorization middleware verifies the token, check role admin or user
//check role using req.auth.role, extract from sql

//user routes requie auth middleware

//get the entire cart and items, everyhting, index 2 tables
router.get("/carts", JWTAuth, async (req, res) => {
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
      cart_id: null,
      items: [],
      subtotal: "0.00",
    });
  }

  //empty cart, cart exists but emmpty values , postgrs poopulate the right table
  // with null because no mathching value exists
  //one result
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
        }) // if the cart is empty , excluding the role with null, taking the row with pid not null
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
//THIS PART REQUIRE TRANSACTION OR QUERY OPTIMIZATIONS
// body data valid -> product -> user cart exists -> add
router.post(
  "/carts/items",
  JWTAuth,
  [
    body("quantity").trim().notEmpty().withMessage("Quantity required"),
    body("pID").trim().notEmpty().withMessage("Product id is required"),
  ], //need extra check
  async (req, res) => {
    //check valid body data
    const id = req.auth.userID; //the id to identify the user
    const { quantityWanted, pID } = req.body; //get the product id and quantity feom the client, need validation

    //check whethrre the product exists, active and stock
    const productInfo = await db.oneOrNone(
      `SELECT product_id, price, description,stock_quantity 
      FROM products WHERE product_id = $1 
      AND stock_quantity >= $2 
      AND is_active = TRUE`,
      pID,
      quantityWanted,
    );
    //check two things, cannot find product 404
    if (productInfo === null) {
      res.status(404).json({
        error: "Product not found",
      });
    }
    //check insufficient stock
    //need to setup a threshiold in db
    //the request is valid but it
    // conflict with current state of the inventory (insufficient)
    // on the sever
    //the databse constraint check whether the stock is bigger and equal to 0
    //app context ->  we check the db stock against the requested amount
    if (productInfo.stock_quantity < quantityWanted) {
      res.status(409).json({
        error: "Insufficient stock",
        reqStock: quantityWanted, //requested stock
        actualStock: productInfo.stock_quantity, //actual stock
      });
    }

    let cartID; //declare a variable here if exitsing then .. if do not exist ...
    //check if the user has a cart, if there is none create, else use the existing cart
    const cartExists = await db.oneOrNone(
      "SELECT cart_id created_at FROM cart WHERE user_id = $1 RETURNING cart_id",
      id,
    );

    //no rows returned, do not exists
    if (cartExists === null) {
      //create one and returning the new cart id
      const newCart = await db.one(
        "INSERT INTO cart (user_id) VALUES($1) RETURNING cart_id",
        id,
      );
      //new id for new cart, store it in here
      cartID = newCart.cart_id;
    }
    //use existing cart id
    cartID = cartExists.cart_id;

    //return product info
    //cannot insert the same product as product id and cart id  is unique,if violated vilate unique constraint
    //Repeated items are not allowed
    //so if add repeated products, ensure users specifiy the right about for that individual product items
    //consider existin items in the cart, avoiding add duplicates
    //tatocal insertion
    const cartItems = await db.one(
      `INSERT INTO cart_items (description,quantity, cart_id, product_id,price) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING *`,
      productInfo.description,
      quantityWanted,
      cartID, //use this when the cart exists
      productInfo.product_id,
      productInfo.price,
    );

    //items created, return info confirmation
    return res.status(201).json({
      itemsID: cartItems.id,
      description: cartItems.description,
      quantity: cartItems.quantity,
      pID: cartItems.product_id,
      price: cartItems.price,
      createdAt: cartItems.created_at,
    });

    //also need to think about decreasing the stock, stock decreasing happens when checking out, order established
  },
);

//remove items in the cart by id
//params
//we need to identify
//  the user cart and then the cart items id to delete from
//cart id identigies which user cart to look into
//cart item id tatget the exacgt item to remove

router.delete("/cart/:cartID/items/:cartItemsid", JWTAuth, async (req, res) => {
  //get the cartid and cart items id
  const { cid, ciID } = req.params;
  const uID = req.auth.userID; //user identifier

  //index into db, delete from cart
  //check user cart exists
  //you confirm by the cart exits here
  const checkCart = await db.oneOrNone(
    "SELECT cart_id FROM cart WHERE user_id = $1 AND cart_id = $2",
    uID,
    cid,
  );

  //if the cart do not exists
  if (checkCart === null) {
    return res.status(404).send({
      error: "Cart not found",
    });
  }
  //cart exists
  //item deletion
  //then perform deletion
  const deletion = await db.result(
    "DELETE FROM cart_items WHERE id = $1",
    ciID,
  );

  //resource to be deleted does not exists
  if (deletion.rowCount === 0) {
    return res.status(404).json({
      error: "Item not found",
    });
  }

  // successful deletion
  // deleting something that just has been deleted
  //the state of the sever remains the same even if there are further attempts in deleting the same resource
  //this is more about context
  //tells the client the outcome has been acheived
  //returning 204 treats an already satisfied deletion request as successful
  res.status(204).send();
});

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
