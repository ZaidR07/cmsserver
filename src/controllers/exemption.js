import mongoose from "mongoose";
import { logger } from "../logger.js";

export const AddExemption = async (req, res) => {
  try {
    const { payload } = req.body;

    if (
      !payload ||
      !payload.student_id ||
      !payload.db ||
      !payload.amount ||
      !payload.reason ||
      !payload.installments
    ) {
      return res.status(400).json({
        message:
          "Required Fields are Missing (student_id, db, amount, reason, installments)",
      });
    }

    const {
      student_id,
      db,
      reason,
      installments: exemptedInstallments = [],
    } = payload;
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

    // Get last exemption ID
    const lastExemption = await clientdb
      .collection("exemptions")
      .findOne({}, { sort: { exemption_id: -1 } });

    const newExemptionId = lastExemption
      ? lastExemption.exemption_id + 1
      : 700001;

    // Process installments
    let updatedInstallments = student.installments || [];
    const exemptionsToAdd = [];

    if (exemptedInstallments && exemptedInstallments.length > 0) {
      // Create a map of exempted installments for easy lookup
      const exemptedInstallmentsMap = new Map();
      exemptedInstallments.forEach((inst) => {
        exemptedInstallmentsMap.set(inst.installmentno, inst.amount);
      });

      // Process each installment in student's record
      updatedInstallments = updatedInstallments
        .map((installment) => {
          const exemptedAmount = exemptedInstallmentsMap.get(
            installment.installmentno
          );
          if (exemptedAmount) {
            // Create exemption record for each installment
            exemptionsToAdd.push({
              month: new Date(installment.dueDate).toLocaleString("default", {
                month: "long",
              }),
              amount: exemptedAmount,
              reason: reason,
            });

            // If installment is fully exempted, it will be removed (filtered out later)
            // If partially exempted, reduce the amount
            const newAmount = installment.amount - exemptedAmount;
            return { ...installment, amount: newAmount };
          }
          return installment;
        })
        .filter((installment) => {
          // Remove fully paid/exempted installments (amount <= 0)
          return installment.amount > 0;
        });
    }

    const currentBalance = Number(student.balance || 0);
    const newBalance = currentBalance - amount;

    // Create exemption document
    const exemptionDocument = {
      exemption_id: newExemptionId,
      student_id: student_id,
      exemptions: exemptionsToAdd,
      total_amount: amount,
      reason: reason,
      date: new Date(),
    };

    await clientdb.collection("exemptions").insertOne(exemptionDocument);

    // Update student with new balance and installments
    const updateData = {
      $set: {
        balance: newBalance,
        status: newBalance <= 0 ? "fully-paid" : "partially-paid",
        installments: updatedInstallments,
      },
      $push: {
        exemptions: {
          exemption_id: newExemptionId,
          amount: amount,
          date: new Date(),
          reason: reason,
        },
      },
    };

    await clientdb.collection("students").updateOne({ student_id }, updateData);

    return res.status(200).json({
      message: "Exemption added successfully",
      exemption_id: newExemptionId,
      updatedInstallments: updatedInstallments,
      newBalance: newBalance,
    });
  } catch (error) {
    logger.error("Internal Server Error", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
