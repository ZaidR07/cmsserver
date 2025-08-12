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
        const paymentPlan = student.paymentPlan || "full"; // Default to 'full' if not specified

        let status = "fully-paid";
        let dueDate = null;
        let dueAmount = 0;

        const hasInstallments =
          Array.isArray(student.installments) &&
          student.installments.length > 0;

        if (paymentPlan === "full") {
          // Full payment plan logic
          status = balanceFees <= 0 ? "fully-paid" : "partially-paid";
        } else if (hasInstallments) {
          // Sort installments by due date (ascending)
          const sortedInstallments = [...student.installments].sort(
            (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
          );

          // Find all unpaid installments (both past and future)
          const unpaidInstallments = sortedInstallments.filter(
            (inst) => !inst.paid
          );

          if (unpaidInstallments.length > 0) {
            // Find the earliest unpaid installment
            const nextDueInstallment = unpaidInstallments[0];
            dueDate = nextDueInstallment.dueDate;
            dueAmount = nextDueInstallment.amount;

            // Check if this installment is overdue
            const installmentDue = new Date(nextDueInstallment.dueDate);
            installmentDue.setHours(0, 0, 0, 0);

            if (installmentDue < today) {
              status = "overdue";
            } else {
              // Check if there are any paid installments
              const hasPaidInstallments = sortedInstallments.some(
                (inst) => inst.paid
              );
              status = hasPaidInstallments
                ? "partially-paid"
                : "partially-paid"; // Changed from 'unpaid' to 'partially-paid'
            }
          } else {
            // All installments paid
            status = "fully-paid";
          }
        } else {
          // No installments but not full payment plan
          status = balanceFees <= 0 ? "fully-paid" : "partially-paid"; // Changed from 'unpaid' to 'partially-paid'
        }

        return {
          student_id: student.student_id,
          studentName: `${student.firstName} ${student.lastName}`,
          mobile: student.mobile,
          altnumber: student.altnumber,
          admissionDate: student.date,
          totalFees,
          paidFees,
          balanceFees,
          dueDate,
          dueAmount,
          status,
          paymentPlan,
        };
      });

      // Count students by status for this course (only overdue, partially-paid, fully-paid)
      const statusCounts = formattedStudents.reduce(
        (acc, student) => {
          acc[student.status] = (acc[student.status] || 0) + 1;
          return acc;
        },
        {
          overdue: 0,
          "partially-paid": 0,
          "fully-paid": 0,
        }
      );

      return {
        id: course._id,
        courseName: course.course_name,
        statusCounts,
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

    const student = await clientDb
      .collection("students")
      .find({
        student_id: parseInt(student_id),
      })
      .toArray();

    const discounts = await clientDb
      .collection("discounts")
      .find({
        student_id: parseInt(student_id),
      })
      .toArray();

    return res.status(200).json({
      payload: {
        fees: fees,
        installments: student[0].installments,
        exemptions: student[0].exemptions,
        discounts: discounts,
      },
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

    if (
      !payload ||
      !payload.student_id ||
      !payload.db ||
      !payload.amount ||
      !payload.paymentmode
    ) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const { student_id, db, installments: paidInstallments = [] } = payload;
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

    // Process installments if provided
    let updatedInstallments = student.installments || [];
    if (paidInstallments && paidInstallments.length > 0) {
      // Create a map of paid installments for easy lookup
      const paidInstallmentsMap = new Map();
      paidInstallments.forEach((inst) => {
        paidInstallmentsMap.set(inst.installmentno, inst.amount);
      });

      // Process each installment in student's record
      updatedInstallments = updatedInstallments
        .map((installment) => {
          const paidAmount = paidInstallmentsMap.get(installment.installmentno);
          if (paidAmount) {
            // If installment is fully paid, it will be removed (filtered out later)
            // If partially paid, reduce the amount
            const newAmount = installment.amount - paidAmount;
            return { ...installment, amount: newAmount };
          }
          return installment;
        })
        .filter((installment) => {
          // Remove fully paid installments (amount <= 0)
          return installment.amount > 0;
        });
    }

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
      receiptno: receiptno,
      fee_id: newFeeId,
      date: new Date(),
    };

    await clientdb.collection("fees").insertOne(feeDocument);

    // Update student with new balance and installments
    const updateData = {
      $set: {
        balance: newBalance,
        status: newBalance <= 0 ? "fully-paid" : "partially-paid",
        installments: updatedInstallments,
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
    };

    await clientdb.collection("students").updateOne({ student_id }, updateData);


    const receiptformat = await clientdb
      .collection("receiptformat")
      .find({})
      .toArray();

       
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
      paidInstallments: paidInstallments, // Include paid installments in receipt
    };

    const receipt =  await generateReceipt(receiptdata, receiptformat[0], "./generated_bills");

    receiptdata.receiptUrl = receipt

    await clientdb.collection("receipts").insertOne(receiptdata);

    return res.status(200).json({
      message: "Fees paid Successfully",
      fee_id: newFeeId,
      updatedInstallments: updatedInstallments,
    });
  } catch (error) {
    logger.error("Internal Server Error", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
