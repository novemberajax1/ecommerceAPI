import { Router } from "express";
import { query, validationResult } from "express-validator";
const router = Router();

//these routes are public anyone can access it

//get all products , searching for all products
//use req.query
//pass optional data as kv pairs
//validate query
//use LIKE in db , searching for a wide category
router.get("/products", async (req, res) => {
  const { q } = req.query;
});

//specific
router.get("/products/:id", async (req, res) => {});

export default productRouter;
