import mongoose from "mongoose";
import { logger } from "../logger.js";

export const addAdmin = async (req, res) => {
    const decrypteddata = response.data.payload;

    console.log(decrypteddata);
    

    const { name, mobile, email } = decrypteddata;

    if (!name || !mobile || !email) {
        logger.error("Required fields are missing");
        return res.status(400).json({
            message: "Required Fields are Missing"
        });
    }

    const dbName = mongoose.connection.name;
    console.log("Connected to database:", dbName);

    // Continue with your logic to add admin...
};
