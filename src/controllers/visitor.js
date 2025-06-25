import mongoose from "mongoose";
import { logger } from "../logger.js";

export const addVisitor = async (req, res) => {
  try {

    const { ip , db  } = req.body.payload;

    if (!ip) {
      logger.error("IP address is missing");
      return res.status(400).json({
        message: "IP address is missing",
      });
    }

    if(!db){
        logger.error("database connection error")
    }

    const database = mongoose.connection ;
    const classesdb = database.useDb( db , { useCache: true });

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 01 to 12

    // Dynamically create the update path: "years.2025.05"
    const updatePath = `years.${year}.${month}`;

    await classesdb
      .collection("visitors")
      .updateOne(
        { name: "counter" },
        { $inc: { [updatePath]: 1 } },
        { upsert: true }
      );

    return res.status(200).json({
      message: "Visitor recorded",
    });
  } catch (error) {
    logger.error("Error adding visitor:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



export const getVisitorNumbers = async (req, res) => {
  try {
    const db = req.query.db;

    if(!db){
      return res.status(400).json({
        message : "Required Fields are Missing"
      })
    }

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    const now = new Date();
    const currentYear = now.getFullYear();

    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const monthOrder = [
      "01", "02", "03", "04", "05", "06",
      "07", "08", "09", "10", "11", "12"
    ];

    const monthlyData = {};
    monthOrder.forEach((month) => {
      monthlyData[month] = {
        visitors: 0,
        enquiries: 0,
      };
    });

    // Enquiries
    const enquiries = await classesdb
      .collection("enquiries")
      .find({
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      })
      .toArray();

    enquiries.forEach((enq) => {
      const date = new Date(enq.createdAt);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      if (monthlyData[month]) monthlyData[month].enquiries += 1;
    });

    // Visitors
    const visitorDoc = await classesdb
      .collection("visitors")
      .findOne({ name: "counter" });

    if (visitorDoc?.years?.[currentYear]) {
      const yearData = visitorDoc.years[currentYear];
      for (const month in yearData) {
        if (monthlyData[month]) {
          monthlyData[month].visitors += yearData[month];
        }
      }
    }

    const MONTH_NAMES = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const result = monthOrder.map((monthNum, index) => ({
      month: MONTH_NAMES[index],
      visitors: monthlyData[monthNum].visitors,
      enquiries: monthlyData[monthNum].enquiries,
    }));

    return res.status(200).json({ payload: result });
  } catch (error) {
    logger.error("Error fetching visitor/enquiry data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

