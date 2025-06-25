import mongoose from "mongoose";
import { generateReceipt } from "../util/receiptgenerator.js";
import { logger } from "../logger.js";

export const ResendReceipt = async (req, res) => {
  try {
    const { db, receiptno } = req.body;

    if ((!db, !receiptno)) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const database = mongoose.connection;

    const clientdb = database.useDb(db, { useCache: true });

    if (!clientdb.name) {
      return res.status(500).json({
        message: "Internal Server Error/db",
      });
    }

    const receiptdata = await clientdb.collection("receipts").findOne({
      receiptno: receiptno,
    });

    const receiptformat = await clientdb
      .collection("receiptformat")
      .find({})
      .toArray();

    await generateReceipt(receiptdata, receiptformat[0], "./generated_bills");

    return res.status(200).json({
      message: "Receipt Sent Successfully",
    });
  } catch (error) {
    logger.error(error)
    return res.status(500).json({
        message : "Internal Server Error"
    })
  }
};
