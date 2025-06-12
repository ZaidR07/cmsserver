import mongoose from "mongoose";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../util/s3Client.js";

export const AddUpdateReceipt = async (req, res) => {
  try {
    
    const files = req.files;
    const data = req.body;
    const db = mongoose.connection;
    const classesdb = db.useDb(data.db, { useCache: true });

    const receiptCollection = classesdb.collection("receiptformat");

    // Upload files if present and add their URLs to data object
    if (files) {
      for (const [key, fileArray] of Object.entries(files)) {
        if (fileArray?.length > 0) {
          const file = fileArray[0];
          const fileKey = `${data.db}/${data.companyName}/${Date.now()}_${file.originalname}`;
          const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          await s3Client.send(new PutObjectCommand(uploadParams));

          const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
          data[key] = fileUrl; // e.g., data.logo = <URL>
        }
      }
    }

    // Prepare update fields (only non-null and non-undefined)
    const updateFields = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== "") {
        updateFields[key] = value;
      }
    }

    // Check if a record already exists
    const existing = await receiptCollection.findOne({
      companyName: data.companyName,
    });

    if (existing) {
      // Update existing document
      await receiptCollection.updateOne(
        { companyName: data.companyName },
        { $set: updateFields }
      );
    } else {
      // Insert new document
      await receiptCollection.insertOne(updateFields);
    }

    return res.status(200).json({
      message: existing
        ? "Receipt format updated successfully."
        : "Receipt format added successfully.",
    });
  } catch (error) {
    console.error("Error in AddUpdateReceipt:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const GetReceiptFormat = async (req, res) => {
  try {
    const { db } = req.query;

    if (!db) {
      return res.status(400).json({ message: "Missing Required Fields" });
    }

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    const receipt = await classesdb
      .collection("receiptformat")
      .find({})
      .toArray();

    if (!receipt || receipt.length === 0) {
      return res.status(404).json({
        message: "No receipt data found",
      });
    }

    return res.status(200).json({
      payload: receipt,
    });
  } catch (error) {
    console.error("Error fetching receipt format:", error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};
