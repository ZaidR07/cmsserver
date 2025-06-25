import mongoose from "mongoose";
import { logger } from "../logger.js";

export const CreateEnquiry = async (req, res) => {
  try {
    const { fullname, email, subject, message, db, mobile } = req.body.payload;

    const missingFields = [];
    if (!fullname) missingFields.push("fullname");
    if (!email) missingFields.push("email");
    if (!subject) missingFields.push("subject");
    if (!message) missingFields.push("message");
    if (!mobile) missingFields.push("mobile");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Required fields are missing",
        missing: missingFields,
      });
    }
    const database = mongoose.connection;

    const clientDb = database.useDb(db, { useCache: true });

    if (!clientDb.name) {
      logger.error("Database Connection Error");
      return res.status(400).json({
        message: "Internal Server/db Error",
      });
    }

    // ADD: If enquiry_id not present, add a new student
    const Lastenquiry = await clientDb
      .collection("enquiries")
      .findOne({}, { sort: { enquiry_id: -1 } });

    const enquiry_id = Lastenquiry ? Lastenquiry.enquiry_id + 1 : 500001;

    await clientDb.collection("enquiries").insertOne({
      enquiry_id,
      fullname,
      email,
      subject,
      message,
      mobile,
      status: true,
      createdAt: new Date(),
    });

    return res.status(200).json({
      message: "Enquiry Sent Successfully",
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const GetEnquiry = async (req, res) => {
  try {
    const { db } = req.query;

    if (!db) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const database = mongoose.connection;
    const clientDb = database.useDb(db, { useCache: true });

    if (!clientDb.name) {
      return res.status(400).json({
        message: "Internal Server/db Error",
      });
    }

    const enquiries = await clientDb
      .collection("enquiries")
      .find({
        status: true,
      })
      .sort({ enquiry_id: -1 }) // Default sort by enquiry_id in descending order
      .toArray();

    return res.status(200).json({
      payload: enquiries,
    });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const CloseEnquiry = async (req, res) => {
  try {
    const { db, enquiry_id } = req.body;

    if (!db || !enquiry_id) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const database = mongoose.connection;
    const clientDb = database.useDb(db, { useCache: true });

    if (!clientDb.name) {
      return res.status(400).json({
        message: "Internal Server/db Error",
      });
    }

    await clientDb.collection("enquiries").updateOne(
      { enquiry_id: enquiry_id }, // Filter object
      { $set: { status: false } } // Update object
    );

    return res.status(200).json({
      message : "Enquiry Closed Successfully"
    });
  } catch (error) {
    logger.error("Error fetching enquiries:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
