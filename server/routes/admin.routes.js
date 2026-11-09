import { Router } from "express";
import requireAdmin from "../middleware/requireAdmin";
import JWTAuth from "../middleware/jwtmiddleware";
const router = Router();

//admin paths
//route in here all require admin access
//need to specify role ?? how
router.post("/admin/products", JWTAuth, requireAdmin, async (req, res) => {});

//rbac role

router.patch(
  "/admin/products/:id",
  JWTAuth,
  requireAdmin,
  async (req, res) => {},
);

router.delete(
  "/admin/products/:id",
  JWTAuth,
  requireAdmin,
  async (req, res) => {},
);

export default adminRouter;
