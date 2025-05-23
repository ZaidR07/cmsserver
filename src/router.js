import { Router } from "express";
import { AdminLogin } from "./controllers/login.js";
// import { CheckUser } from "./middleware/auth.js";
import { addAdmin } from "./controllers/admin.js";

const approuter = Router();

approuter.post("/api/adminlogin",AdminLogin);
approuter.post("/api/createadmin",addAdmin);


export default approuter;