import mongoose from "mongoose";
import { logger } from "../logger.js";
import { generateReceipt } from "../util/receiptgenerator.js";

export const getPendingFeePerCourse = async (req, res) => {
  try {
    const { db } = req.query;

    if (!db) {
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    const database = mongoose.connection;
    const clientDb = database.useDb(db, { useCache: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all active students
    const students = await clientDb
      .collection("students")
      .find({ active: true })
      .toArray();

    const courses = await clientDb.collection("courses").find({}).toArray();

    const result = courses.map((course) => {
      const relatedStudents = students.filter(
        (student) => student.course == course.course_id
      );

      const formattedStudents = relatedStudents.map((student) => {
        const totalFees = parseFloat(student.totalPayment) || 0;
        const paidFees = parseFloat(student.payment) || 0;
        const balanceFees = student.balance;

        let status = "fully-paid";
        let dueDate = null;

        const hasInstallments =
          Array.isArray(student.installments) &&
          student.installments.length > 0;

        if (hasInstallments) {
          const sortedInstallments = [...student.installments].sort(
            (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
          );

          dueDate = sortedInstallments[0]?.dueDate || null;

          const hasOverdue = sortedInstallments.some((installment) => {
            const installmentDue = new Date(installment.dueDate);
            installmentDue.setHours(0, 0, 0, 0);
            return installmentDue < today;
          });

          if (hasOverdue) {
            status = "due";
          } else if (balanceFees > 0) {
            status = "partially-paid";
          }
        }

        return {
          student_id: student.student_id,
          studentName: `${student.firstName} ${student.lastName}`,
          mobile: student.mobile,
          altnumber: student.altnumber,
          admissionDate: student.date,
          totalFees,
          balanceFees,
          dueDate,
          status,
        };
      });

      // Only count students who are overdue
      const pendingCount = formattedStudents.filter(
        (s) => s.status === "due"
      ).length;

      return {
        id: course._id,
        courseName: course.course_name,
        pendingCount,
        students: formattedStudents,
      };
    });

    return res.status(200).json({ payload: result });
  } catch (error) {
    console.error("Error in getPendingFeePerCourse:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const GetFeeHistoryofstudent = async (req, res) => {
  try {
    const { student_id, db } = req.query;

    if (!db || !student_id) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const database = mongoose.connection;

    const clientDb = database.useDb(db, { useCache: true });

    if (!clientDb.name) {
      return res.status(500).json({
        message: "Internal Server Error/db",
      });
    }

    const fees = await clientDb
      .collection("fees")
      .find({
        student_id: parseInt(student_id),
      })
      .toArray();

    return res.status(200).json({
      payload: fees,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const PayFees = async (req, res) => {
  try {
    const { payload } = req.body;

    if (!payload || !payload.student_id || !payload.db || !payload.amount) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const { student_id, db } = payload;
    const data = { ...payload };
    const amount = Number(data.amount);

    const database = mongoose.connection;
    const clientdb = database.useDb(db, { useCache: true });

    if (!clientdb) {
      logger.error("Database connection failed");
      return res.status(500).json({
        message: "Internal Server Error - Database connection failed",
      });
    }

    const student = await clientdb
      .collection("students")
      .findOne({ student_id });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const currentBalance = Number(student.balance || 0);
    const newBalance = currentBalance - amount;

    const lastFee = await clientdb
      .collection("fees")
      .findOne({}, { sort: { fee_id: -1 } });

    const newFeeId = lastFee ? lastFee.fee_id + 1 : 400001;

    const LastReceipt = await clientdb.collection("receipts").findOne(
      {},
      {
        sort: {
          receiptno: -1,
        },
      }
    );

    const receiptno = LastReceipt ? LastReceipt.receiptno + 1 : 101;

    delete data.db;

    const feeDocument = {
      ...data,
      student_id,
      receiptno : receiptno,
      fee_id: newFeeId,
      date: new Date(),
    };

    await clientdb.collection("fees").insertOne(feeDocument);

    await clientdb.collection("students").updateOne(
      { student_id },
      {
        $set: {
          balance: newBalance,
          status: newBalance <= 0 ? "fully-paid" : "partially-paid",
        },
        $push: {
          fees: {
            fee_id: newFeeId,
            amount: amount,
            date: new Date(),
            mode: data.mode || data.paymentmode || "Cash",
            note: data.note || "",
          },
        },
      }
    );

    const receiptdata = {
      receiptno,
      student_id,
      fee_id: newFeeId,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      course: student.course,
      totalPayment: student.totalPayment,
      discount: student.discount,
      payment: data.amount,
      balance: newBalance,
      paymentmode: data.paymentmode,
      chequeNo: data.chequeNo || "",
      createdAt: new Date(),
    };

    await clientdb.collection("receipts").insertOne(receiptdata);

    const receiptformat = await clientdb
      .collection("receiptformat")
      .find({})
      .toArray();

    await generateReceipt(receiptdata, receiptformat[0], "./generated_bills");

    return res.status(200).json({
      message: "Fees paid Successfully",
      fee_id: newFeeId,
    });
  } catch (error) {
    logger.error("Internal Server Error", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


