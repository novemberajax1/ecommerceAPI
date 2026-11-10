import db from "../database/postgres";

async function requireAdmin(req, res, next) {
  //the admin defintly will have an id of 1, it will be the seed data inserted before users
  //db access current
  const { id } = req.auth.userID; //this is inthe JWT payload

  //source of truth, retirn one result
  const results = await db.oneOrNone(
    "SELECT role FROM users WHERE id = $1",
    id, //check id
  );
  //check empty
  if (results === null) {
    return res.status(404).send({
      error: "Not found",
    });
  }
  //check first role
  //returns one role
  if (results.role !== "admin") {
    return res.status(403).send({
      error: "Forbidden",
    });
  }
  next(); //pass control to req handler
}

export default requireAdmin;
