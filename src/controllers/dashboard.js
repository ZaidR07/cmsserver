import mongoose from "mongoose";
import { logger } from "../logger.js";

export const getDashboardNumbers = async (req, res) => {
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

    // Get first and last date of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const now = new Date();
    const currentYear = now.getFullYear();
    const cutoffDate = new Date(`${currentYear}-05-30`);

    // Fetch students
    const students = await clientDb
      .collection("students")
      .find({ active: true })
      .toArray();

    const filteredstudents = students.filter((item) => {
      const sessionYear = parseInt(item.session);
      if (isNaN(sessionYear)) return false;

      if (sessionYear > currentYear) {
        return true;
      } else if (sessionYear === currentYear) {
        return now >= cutoffDate; // include if today is before or on 30 May
      }
      return false;
    });

    const totalStudents = filteredstudents.length;

    // Admissions this month (based on createdAt or admissionDate field)
    const thisMonthAdmissions = await clientDb
      .collection("students")
      .countDocuments({
        active: true,
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

    // Total courses
    const totalCourses = await clientDb
      .collection("courses")
      .countDocuments({});

    let pendingFeesCount = 0;

    for (const student of students) {
      if (
        Array.isArray(student.installments) &&
        student.installments.length > 0
      ) {
        const sortedInstallments = student.installments.sort(
          (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
        );

        const hasOverdue = sortedInstallments.some((installment) => {
          const due = new Date(installment.dueDate);
          due.setHours(0, 0, 0, 0);

          const isPaid =
            installment.paid === true || installment.paid === "true"; // ensure not a string "false"
          const overdue = due < today && !isPaid;

          return overdue;
        });

        if (hasOverdue) pendingFeesCount++;
      }
    }

    // Format response
    const statsData = [
      {
        title: "Total Students",
        count: totalStudents,
        icon: "Users",
      },
      {
        title: "Total Courses",
        count: totalCourses,
        icon: "Course",
      },
      {
        title: "Admissions This Month",
        count: thisMonthAdmissions,
        icon: "Admission",
      },
      {
        title: "Pending Fees",
        count: pendingFeesCount,
        icon: "Fee",
      },
    ];

    return res.status(200).json({ payload: statsData });
  } catch (error) {
    logger.error("Error in getDashboardNumbers:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
