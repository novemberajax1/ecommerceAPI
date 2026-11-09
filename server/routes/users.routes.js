import { Router } from "express";
import JWTAuth from "../middleware/jwtmiddleware";

const router = Router();

//authorization middleware verifies the token, check role admin or user
//check role using req.auth.role, extract from sql

//user routes requie auth middleware

//get the entire cart and items
router.get("/cart", JWTAuth, async (req, res) => {});

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
