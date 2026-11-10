import express from express;
import error_handler from "./middleware/customeerrhandler";
import authRouter from "./routes/auth.routes";
import adminRouter from "./routes/admin.routes";
import productRouter from "./routes/products.routes";
import usersRouter from "./routes/users.routes";

const app = express();

app.use(express.json())







app.use(error_handler);
