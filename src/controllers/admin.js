import mongoose from "mongoose";
import { logger } from "../logger.js";
import { Resend } from "resend";
import { decryptData, encryptData } from "../util/Data_protection.js";

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

const resend = new Resend("re_ccuAZtfq_qWsMFDrWjLSwX1vt6qm5GFCp");
const key = process.env.KEY;

export const SendForgotPasswordOtp = async (req, res) => {
  try {
    const decryptedData = decryptData(req.body, key);
    const { client_id, admin_id } = decryptedData;

    // Validate required fields
    if (!client_id || !admin_id) {
      logger.error("Required fields are missing");
      return res.status(400).json({
        success: false,
        message: "Client ID and Admin ID are required",
      });
    }

    // Access the main database (classesmanagementsystem)
    const mainDb = mongoose.connection;

    // Query the clients collection to find the client
    const client = await mainDb.collection("clients").findOne({
      client_id: parseInt(client_id),
    });

    if (!client) {
      logger.error(`Client not found: ${client_id}`);
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Get the client-specific database name
    const clientDbName = client.dbname;
    if (!clientDbName) {
      logger.error(`No database specified for client: ${client_id}`);
      return res.status(400).json({
        success: false,
        message: "No database specified for client",
      });
    }

    // Switch to the client-specific database
    const clientDb = mainDb.useDb(clientDbName, { useCache: true });

    // Check if admin exists
    const admin = await clientDb.collection("admin").findOne({
      admin_id: admin_id,
    });

    if (!admin) {
      logger.error(`Admin not found: ${admin_id}`);
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Generate OTP and set expiry (2 minutes from now)
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

    // Update admin record with OTP and expiry
    await clientDb.collection("admin").updateOne(
      { admin_id: admin_id },
      {
        $set: {
          resetPasswordOtp: encryptData(otp.toString(), process.env.KEY),
          resetPasswordOtpExpiry: otpExpiry,
        },
      }
    );

    // Email content
    const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>We received a request to reset your password for Bright Minds Admin Panel.</p>
                <p>Your OTP code is:</p>
                <div style="background: #f3f4f6; padding: 16px; text-align: center; margin: 16px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                    ${otp}
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
                <p style="font-size: 12px; color: #6b7280;">Bright Minds Admin Team</p>
            </div>
        `;

    // Send email
    await resend.emails.send({
      from: `Bright Minds <no-reply@t-rexinfotech.in>`,
      to: [admin_id],
      subject: "OTP to reset password",
      html: htmlContent,
    });

    logger.info(`OTP sent successfully to ${admin_id}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      // Don't send OTP back in production
    });
  } catch (error) {
    logger.error(`Error in SendForgotPasswordOtp: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message || "Internal server error",
    });
  }
};





export const VerifyOtpResetPassword = async (req, res) => {
  try {
    
    
    const decryptedData = decryptData(req.body, key);
    const { client_id, admin_id, otp, new_password } = decryptedData;

    // Validate required fields
    if (!client_id || !admin_id || !otp || !new_password) {
      logger.error("Required fields are missing");
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate password length
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Access the main database (classesmanagementsystem)
    const mainDb = mongoose.connection;

    // Query the clients collection to find the client
    const client = await mainDb.collection("clients").findOne({
      client_id: parseInt(client_id),
    });

    if (!client) {
      logger.error(`Client not found: ${client_id}`);
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Get the client-specific database name
    const clientDbName = client.dbname;
    if (!clientDbName) {
      logger.error(`No database specified for client: ${client_id}`);
      return res.status(400).json({
        success: false,
        message: "No database specified for client",
      });
    }

    // Switch to the client-specific database
    const clientDb = mainDb.useDb(clientDbName, { useCache: true });

    // Find admin record
    const admin = await clientDb.collection("admin").findOne({
      $or: [{ admin_id: admin_id }, { email: admin_id }],
    });

    if (!admin) {
      logger.error(`Admin not found: ${admin_id}`);
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check if OTP exists and is not expired
    if (!admin.resetPasswordOtp || !admin.resetPasswordOtpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No OTP request found",
      });
    }

    // Check OTP expiry
    const now = new Date();
    if (now > new Date(admin.resetPasswordOtpExpiry)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Verify OTP
    const storedOtp = decryptData(admin.resetPasswordOtp, process.env.KEY);
    if (otp !== storedOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Update password and clear OTP fields
    await clientDb.collection("admin").updateOne(
      { _id: admin._id },
      {
        $set: {
          password: encryptData(new_password, process.env.KEY),
          resetPasswordOtp: null,
          resetPasswordOtpExpiry: null,
        },
      }
    );

    logger.info(`Password reset successful for admin: ${admin_id}`);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    logger.error(`Error in VerifyOtpResetPassword: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message || "Unknown error",
    });
  }
};
