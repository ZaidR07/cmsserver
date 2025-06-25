import mongoose from "mongoose";
import { logger } from "../logger.js";
import { encryptData } from "../util/Data_protection.js";

export const addOrUpdateAdmin = async (req, res) => {
  try {
    const { name, mobile, email, db } = req.body.payload;
    const data = req.body.payload;

    // Validate required fields
    if (!name || !mobile || !email || !db) {
      logger.error("Required fields are missing");
      return res.status(400).json({
        success: false,
        message: "Name, mobile, email and db are required fields",
      });
    }

    if (!db) {
      logger.error("Database not specified");
      return res.status(400).json({
        success: false,
        message: "Database not specified",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const database = mongoose.connection;
    const clientdb = database.useDb(db, { useCache: true });

    // Prepare admin data (using email as admin_id)
    const adminData = {
      admin_id: email, // Using email as admin_id
      name,
      mobile,
      email,
      updatedAt: new Date(),
    };

    // Check if admin already exists
    const existingAdmin = await clientdb
      .collection("admin")
      .findOne({ admin_id: email });

    if (existingAdmin) {
      // Update existing admin - only allow name and mobile to be updated
      const result = await clientdb.collection("admin").updateOne(
        { admin_id: email },
        {
          $set: {
            name,
            mobile,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(200).json({
          success: true,
          message: "No changes detected",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Admin updated successfully",
      });
    } else {
      // Create new admin
      delete data.db;
      const password = encryptData("123456", process.env.KEY);

      const newAdmin = {
        ...adminData,
        password,
        rank: "2",
        createdAt: new Date(),
        active: true, // Default status for new admins
      };

      await clientdb.collection("admin").insertOne(newAdmin);

      return res.status(201).json({
        success: true,
        message: "Admin created successfully",
      });
    }
  } catch (error) {
    logger.error(`Error in addOrUpdateAdmin: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getAdmins = async (req, res) => {
  try {
    const { db } = req.query;

    if (!db) {
      return res.status.json({
        message: "Required Fields are Missing",
      });
    }

    const database = mongoose.connection;

    const clientdb = database.useDb(db, { useCache: true });

    const admins = await clientdb
      .collection("admin")
      .find({
        active: true,
        rank: { $ne: "1" }, // rank not equal to "1"
      })
      .toArray();

    if (admins?.length == 0) {
      return res.status(404).json({
        message: "No Admins Found",
      });
    }

    return res.status(200).json({
      payload: admins,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { admin_id, db } = req.body.payload;

    if (!admin_id || !db) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const database = mongoose.connection;

    // Correct database selection
    const clientdb = database.useDb(db, { useCache: true });

    if (!clientdb.name) {
      return res.status(400).json({
        message: "Internal Server Error/db",
      });
    }

    // Correct update syntax
    await clientdb.collection("admin").updateOne(
      { admin_id: admin_id }, // filter
      { $set: { active: false } } // update object
    );

    return res.status(200).json({
      message: "Deletion Successful",
    });
  } catch (error) {
    console.error("Error in deleteAdmin:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
