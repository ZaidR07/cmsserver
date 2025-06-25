import mongoose from "mongoose";
import { logger } from "../logger.js";

function generatePassword() {
  const prefix = "aici";
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // ensures a 4-digit number
  return prefix + randomNumber;
}

export const CreateExam = async (req, res) => {
  const data = req.body.payload;
  const dbname = req.body.db;

  try {
    if (!data) {
      logger.error("No data in payload");
      return res.status(400).json({
        message: "No Data Received",
      });
    }

    const db = mongoose.connection;

    const classesdb = db.useDb(dbname, { useCache: true });

    const Lastexam = await classesdb
      .collection("exams")
      .findOne({}, { sort: { exam_id: -1 } });

    const exam_id = Lastexam ? Lastexam.exam_id + 1 : 200001;

    const password = await generatePassword();

    data.exam_id = exam_id;
    data.password = password;
    data.createdAt = new Date();

    await classesdb.collection("exams").insertOne(data);

    return res.status(200).json({
      message: "Exam Created Successfully",
    });
  } catch (error) {
    logger.error(error);
    return res.status(200).json({
      message: "Internal Server Error",
    });
  }
};

export const getExams = async (req, res) => {
  try {
    const { dbname } = req.query;

    if (!dbname) {
      logger.error("Database Name is Missing");
      return res.status(400).json({
        message: "No Data Received",
      });
    }

    const db = mongoose.connection;

    const classesdb = db.useDb(dbname, { useCache: true });

    const exams = await classesdb.collection("exams").find({}).toArray();

    if (!exams || exams?.length < 0) {
      return res.status(404).json({
        message: "No Exams Found",
      });
    }

    return res.status(200).json({
      payload: exams,
      message: "Exams Retreived Successfully",
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Internal sercver error",
    });
  }
};

export const studentExamLogin = async (req, res) => {
  const { student_id, exam_id, password, dbname } = req.body.payload;

  try {
    // Validate required fields
    if (!student_id || !exam_id || !password || !dbname) {
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    const db = mongoose.connection;
    const classesdb = db.useDb(dbname, { useCache: true });

    // Convert IDs to numbers if they're strings
    const parsedStudentId =
      typeof student_id === "string" ? parseInt(student_id) : student_id;
    const parsedExamId =
      typeof exam_id === "string" ? parseInt(exam_id) : exam_id;

    // Query student and exam
    const student = await classesdb
      .collection("students")
      .findOne({ student_id: parsedStudentId });

    console.log(student);

    if (!student) {
      return res.status(403).json({
        message: "Incorrect Student ID",
      });
    }

    const exam = await classesdb
      .collection("exams")
      .findOne({ exam_id: parsedExamId });

    if (!exam) {
      return res.status(403).json({
        message: "Incorrect Exam ID",
      });
    }

    if (exam.password !== password) {
      return res.status(403).json({
        message: "Incorrect Password",
      });
    }

    return res.status(200).json({
      payload: exam.questions,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const studentExamSubmit = async (req, res) => {
  try {
    const { student_id, exam_id, score, dbname } = req.body.payload;

    // Proper validation
    if (!student_id || !exam_id || !score || !dbname) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const db = mongoose.connection;
    const classesdb = db.useDb(dbname, { useCache: true });

    // Add student_id to participants array (if not already present)
    await classesdb.collection("exams").updateOne(
      { exam_id: exam_id },
      {
        $addToSet: { participants: student_id },
      }
    );

    const exam = {
      exam_id: exam_id,
      score: score,
    };

    // Push new exam object to student's exams array
    await classesdb.collection("students").updateOne(
      { student_id: student_id },
      {
        $push: { exams: exam },
      }
    );

    return res.status(200).json({
      message: "Submitted Successfully",
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getExamParticipants = async (req, res) => {
  try {
    const { exam_id, db } = req.query;

    if (!exam_id || !db) {
      return res.status(400).json({ message: "exam_id and db are required" });
    }

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    // Step 1: Find the exam
    const exam = await classesdb
      .collection("exams")
      .findOne({ exam_id: parseInt(exam_id) });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const participantIds = exam.participants || [];

    if (participantIds.length === 0) {
      return res
        .status(200)
        .json({ payload: { exam: exam, participants: [] } });
    }

    // Step 2: Fetch student details
    const students = await classesdb
      .collection("students")
      .find({ student_id: { $in: participantIds } })
      .toArray();

    return res
      .status(200)
      .json({ payload: { exam: exam, participants: students } });
  } catch (error) {
    console.error("Error fetching exam participants:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
