import { Router } from "express";
import JWTAuth from "../middleware/jwtmiddleware";
import { db, insertOrderitems } from "../database/postgres";
import Stripe from "stripe";
import { body, check, validateResult } from "express-validator";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); //API key
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
    else {
      cartID = cartExists.cart_id;
    }

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
      [
        productInfo.description,
        quantityWanted,
        cartID, //use this when the cart exists
        productInfo.product_id,
        productInfo.price,
      ],
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
//change the product stock here
//as this is order establishement
//provide total cost of all items
router.post("/cart/finalized", JWTAuth, async (req, res) => {
  const userid = req.auth.userID; //require validation
  const shippingMethod = req.body.shipping; //require validation

  //check if user has a cart
  const checkCart = db.oneOrNone(
    "SELECT cart_id FROM cart WHERE user_id = $1",
    userid,
  );
  if (checkCart === null) {
    res.status(404).json({
      error: "Cart not found",
    });
  }

  //SELECT all the user associated cart tiems
  // you need the cart, cart id, product price, quantity, description,product_id
  //select cart items assoicated with the cart with assocaee with the user
  //price is from products source of truth in order established price
  //make sure stock is sifficient
  //produce an array of rows
  //the produc price remains the source of truth
  //the price in the cart items table remain
  //as the estimated price when the items waa addeddin to the cart
  //distinct checks if the price has change and return true or false as an indicator
  //arthimetic operation happening in the databse

  const orderItems = await db.any(
    `SELECT products.price AS pPrice, 
    cart_items.price AS ciPrice,
    cart_items.cart_id AS cid,
    cart_items.quantity AS quantity,
    cart_items.description AS desc,
    cart_items.product_id AS pID
    ciPrice IS DISTINCT FROM pPrice AS priceChange
    quantity * pPrice AS linesubtotal
    SUM(quantity * pPrice) OVER() AS orderTotal
    FROM cart_items
    JOIN products ON product.product_id = cart_items.product_id
    JOIN cart ON cart.cart_id = cart_items.cart_id
    WHERE cart.user_id = $1 AND products.is_active = TRUE`,
    userid,
  );

  //user has no cart items
  if (orderItems.length === 0) {
    return res.status(404).json({
      error: "Items not found",
    });
  }

  //returns true if it finds an element that satifies the conditoin else false
  const hasPriceChanged = orderItems.some((items) => {
    return items.priceChange;
  });

  //send the proposed updated total to the user
  //subtotal
  const orderTotal = cartDetails[0].orderTotal;

  //if there are price changes
  //customer need to confirm those changes
  //custom confirms the price from front end, customer must send another http requests to confirm the changes
  //the confirmed amount need to be send from the client requests,
  //  then check against the authorative total (recalaculated in the db)
  //if no change then proceed
  if (hasPriceChanged) {
    //return 409 as the estimated price in the cart conflict with the current checkout price
    return res.status(409).json({
      message: "Prices changed for several products",
      items: orderItems.map((items) => ({
        //the prices of products which are changed
        product_id: items.pID,
        quantity: items.quantity,
        cartPrice: items.ciPricem,
        currentPrice: items.pPrice,
        linesubtotal: items.linesubtotal,
        priceChanged: items.priceChange, //detect price changes
      })),
      proposedsubTotal: orderTotal, //new updated total
    });
  }

  //takke a shipping method from use
  let shipping_cost;

  if (shippingMethod === "standard") {
    shipping_cost = 5; //standard price
  }
  shipping_cost = 10; //express

  //final price including shipping
  const finalPrice = orderTotal + shipping_cost;

  //proceed with with line subtotal of each items and subtotal calculated inside the query
  //create order and insert cart items to order items. we are using product price here
  //when inserting the status is defo pending
  //need to return order id
  //using trsnasaction
  //await for the transaction to finish
  //autoatic commits when suceed, if rehects it. will rollback
  //need to set isolation level as well, concurrency
  //either succed or failed together
  //resolve with the object returning
  //db operation
  const orderCreation = await db.tx(async (t) => {
    //transaction context object
    //created order for user
    const orderResult = await t.one(
      `INSERT INTO 
      order (user_id, total,shipping,status)
       VALUES($1, $2, $3, $4)
      RETURNING order_id,user_id, total,shipping, status, created_at`,
      [userid, finalPrice, shippingMethod, "pending"],
    );

    //rows to be inserted into order items
    //map each object fromm the cart to and created an order item object and then inset into the order items table
    //an array of established orders
    const finalOrder = orderItems.map((items) => ({
      description: items.desc,
      order_id: orderResult.order_id, //order id to be insertef into order items
      price: items.pPrice,
      quantity: items.quantity,
      product_id: items.pID,
    }));

    //an array of transformed order rows into the order items table
    //bulk insertions
    //return an array of rows
    const odrItems = await t.any(insertOrderitems(finalOrder));

    //deduct quantity from the products table based on the user order items
    //need product id, stock quantity,
    //table checks
    //want every product that the user orderd stock to decrease as the order is established
    //unqiue products id and cart
    //bulk updates
    //an array of rows
    //
    const updatedProducts = await t.any(
      `UPDATE products as p SET stock_quantity = p.stock_quantity - ci.quantity
       FROM cart_items as ci 
       JOIN carts as c ON c.cart_id = ci.id
       WHERE c.user_id = $1
       AND p.id = ci.product_id
       AND p.is_active = TRUE
       AND p.stock_quantity >= ci.quantity
       RETURNING p.id AS pid , p.stock_quantity AS stock`,
      userid,
    );

    //check empty
    if (updatedProducts.length === 0) {
      return res.status(404).json({
        error: "User cart not found",
      });
    }
    //if found but the returned products are not as intended
    //check the length against the orderItems (this array consists of all user cart items)
    //rollback and revert changes
    //just checking the length not using the returning values

    if (updatedProducts.length !== orderItems.length) {
      throw new Error("Some products are not updated");
    }

    //return a response
    //order id, order status, ordered items, total
    //the transaction resolve with this json response object
    const result = {
      order: {
        //user order info
        user_id: orderResult[0].userID,
        order_id: orderResult[0].order_id,
        total: orderResult[0].total,
        Shipping: orderResult[0].shipping,
        Status: orderResult[0].status,
        createdAt: orderResult[0].created_at,
        items: odrItems.map((items) => ({
          //all the items
          orderItemsid: items.id,
          productID: items.product_id,
          description: items.description,
          price: items.price,
          createdAt: items.created_at,
          quantity: items.quantity,
        })),
      },
    };

    return result;
  });

  //return http response after the transaction has commmited not inside
  //if returning inside and inventory update fails , client will see 201, that will be incorrect
  //confirm order creation
  return res.status(201).json({
    orderCreation,
  });
});

//get all orders
//user can view this whether the status is pending,fufilled, succeeds
//add indexing later

router.get("/orders", JWTAuth, async (req, res) => {
  const userid = req.auth.userID;

  //check if user has this order
  const checkOrder = db.oneOrNone(
    "SELECT order_id FROM order WHERE user_id = $1",
    userid,
  );

  if (!checkOrder) {
    return res.status(404).json({
      error: "Order not found",
    });
  }
  //get user order details
  const orders = await db.any(
    `SELECT 
    o.order_id AS oID , o.total AS oTotal, 
     o.shipping AS oShipping,o.status AS oStatus,
    oi.id AS oiID, oi.description AS oiDesc, 
    oi.price AS oiPrice,
    oi.quantity AS oiQuant, oi.pID AS oiPid
    oi.price * oi.quantity AS oilineSubtotal
    FROM order AS o
    JOIN order_items AS oi ON o.order_id = oi.order_id
    WHERE o.user_id = $1 
    `,
    userid,
  );

  if (orders.length === 0) {
    return res.status(404).json({
      error: "Order items not found",
    });
  }

  const results = {
    orderID: orders[0].oID,
    total: orders[0].oTotal,
    shipping: orders[0].oShipping,
    status: orders[0].oStatus,
    items: orders.map((order) => ({
      orderItemiD: order.oiID,
      description: order.oiDesc,
      unitPrice: order.oiPrice,
      quantity: order.oiQuant,
      productID: order.oiPid,
      lineSubtotal: order.oilineSubtotal,
    })),
  };

  res.status(200).json({
    results,
  });
});

router.get("/orders/:id", JWTAuth, async (req, res) => {
  const itemID = req.params.id;
  const userid = req.auth.userID;

  //check if user has this order
  const checkOrder = db.oneOrNone(
    "SELECT order_id FROM order WHERE user_id = $1",
    userid,
  );
  //if no order
  if (!checkOrder) {
    return res.status(404).json({
      error: "Order not found",
    });
  }

  //select itemm by id
  const specificItem = db.oneOrNone(
    "SELECT id, description, price, quantity, product_id FROM order_items WHERE id = $1 AND order_id = $2",
    [itemID, checkOrder.order_id],
  );

  //order exits but requested order item not found
  if (!specificItem) {
    return res.status(404).json({
      error: "Item not found",
    });
  }

  return res.status(200).json({
    odrItemid: specificItem.id,
    productID: specificItem.product_id,
    name: specificItem.description,
    price: specificItem.price,
    quantity: specificItem.quantity,
  });
});

//intiate payment, index into payment table
//endpoint for stripe checkout sesion

router.post("/orders/checkout-session", JWTAuth, async (req, res) => {
  //use userid to identigy order
  const userid = req.auth.userID;

  //verify the user has an order
  //identigy the order based on id , total is from order
  //prder retrieval
  const userOrders = await db.any(
    `SELECT oi.description AS oiDesc,
     oi.price AS oiPrice, 
     oi.quantity AS oiQuant,
     oi.product_id AS oiPid ,
     oi.created_at AS oiCreatedat, 
     o.order_id AS oOrderid,
     o.total AS oTotal
    FROM order_items AS oi 
    JOIN order AS o  ON o.order_id = oi.id
    WHERE o.user_id = $1`,
    userid,
  );

  //if no order
  if (userOrders.length === 0) {
    return res.status(404).json({
      error: "Order not found",
    });
  }

  //insert a payment record into the payments table first
  const payment = db.one(
    "INSERT INTO PAYMENTS (order_id, user_id, status,total) VALUES($1,$2,$3,$4)",
    [userOrders.oOrderid, userid, "pending", userOrders.oTotal],
  );

  // map it to stripe api defined schema
  const lineItems = userOrders.map((items) => ({
    price_data: {
      currency: "usd",
      unit_amount: items.oiPrice,
      product: items.oiPid,
      product_data: {
        name: items.oiDesc,
        metadata: {
          createdAt: items.oiCreatedat,
        },
      },
    },
    quantity: items.oiQuant,
  }));

  //stripe payment API gateway, authorize payment,  backend authenticates to stripe
  //use strip checkout session

  //payment successful update status  and order status

  //if payment unsuccessfil, revert changes ?? not accept user payments
  //prompt user to user a differnt payment method
  //if repeated failurs, how to handle ?? , use transactions??

  //change order status to fufilled if payment successful
  //session instance
  //total is recalculated here ?
  const session = await stripe.checkout.sessions.create({
    //items that the user bought, need to index db
    line_items: lineItems, //all user products

    mode: "payment", //one time payments
    success_url: `https://${process.env.HOST}/success.html`,
    cancel_url: `https://${process.env.HOST}/cancel.html`,
  });

  //redirect the customer to checkout  page

  res.redirect(303, session.url);

  //veritfy user payments

  //update payment status order status
});

//user exprss webhook to verify payment

export default usersRouter;
