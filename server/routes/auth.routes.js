import { Router } from "express";
import {
  crendentialValidate,
  inputErrhandle,
} from "../validation/authValidation.js";
import argon2 from "argon2";
import db from "../database/postgres.js";
import jwt from "jsonwebtoken";

const router = Router();

//use seed scrupt to inject admin data to table before everythig

//authN
router.post(
  "/auth/signup",
  crendentialValidate,
  inputErrhandle,
  async (req, res) => {
    //extraction
    const { email, password } = req.body;

    //hash password
    const passwordHash = await argon2.hash(password);

    //user obj
    //we need to ensure the first one in the db is a admin,
    const userDetails = {
      uEmail: email,
      uPhash: passwordHash,
    };

    //create user
    const result = await db.one(
      "INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id",
      [userDetails.uEmail, userDetails.uPhash],
    );

    //secret to sign

    const secret = process.env.JWT_SECRET;
    //automatic login , including the id in user id in the payload of the JWT token
    //generate and sign JWT
    //payload,secret, expiration time
    const token = jwt.sign({ userID: result.id }, secret, {
      expiresIn: "15m",
    }); //expires in 15 minutes

    //send the JWT back to client
    return res.status(201).json({
      token: token,
      message: "User created",
    });
    //send JWT to client
  },
);

//subsequent logins

router.post(
  "/auth/login",
  crendentialValidate,
  inputErrhandle,
  async (req, res) => {
    const { email, password } = req.body;

    //compare the stored hash to the inputted pasword
    const results = await db.oneOrNone(
      "SELECT id, password_hash from users WHERE email = $1",
      email,
    );

    //password vertificaiton
    const verified = await argon2.verify(results.password_hash, password);

    if (!verified) {
      res.status(401).send({
        error: "Invalid username or password", //vague error response on purpose
      });
    }

    //secret
    const secret = process.env.JWT_SECRET;

    //generate a token for the usr and sign
    const token = jwt.sign({ userID: results.id }, secret, {
      expiresIn: "15m",
    }); //the signature is generatred fro, payload, header and secret provided

    //send the token back
    return res.status(200).json({
      message: "Login successfully",
      token: token,
    });

    //on other endpoints then when the user request protected path, they send the token back,
    //then the JWT middleare extracts, verifies it,the token,
    //then authoirizatio checks begin who can touch what paths and more
  },
);

export default authRouter;
