import { expressjwt } from "express-jwt";

// the middleware extracts the JWT token from the Authrization headr, verifies it and makes the
//decoded payload available as req.auth

const JWTAuth = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

export default JWTAuth;

//During verification, the signature is recomputed using the trusted secret and compare with the signature
//from the JWT
//WHen the client sends the JWT, the module uses the secret to veritfiy its signature with the supplied JWT
