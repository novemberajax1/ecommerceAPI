import "dotenv/config"; //load the env file into process.env. storing configuration separate from code
import pgPromise from "pg-promise";

//initialize instasnce
const pgp = pgPromise();

//connection
const db = pgp(process.env.DATABASE_URL);

//define columns
//define the schema
const orderItemColumns = new pgp.helpers.ColumnSet(
  ["order_id", "product_id", "quantity", "price", "description"], //the columns to be included in the insertion
  {
    table: "order_items", //the table name
  },
);

//insertion function
function insertOrderitems(items) {
  //query
  return pgp.helpers.insert(items, orderItemColumns);
}

//exporting for shareed use
export { db, insertOrderitems };
