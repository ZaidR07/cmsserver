import s3Client from "../util/s3Client.js";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import mongoose, { disconnect } from "mongoose";
import { logger } from "../logger.js";
import { generateReceipt } from "../util/receiptgenerator.js";

export const AddUpdateStudent = async (req, res) => {
  try {
    const file = req.file;
    const data = req.body;

    const db = mongoose.connection;
    const classesdb = db.useDb(data.folder, { useCache: true });

    let url = null;

    // Handle file upload if file is present
    if (file) {
      const fileKey = `${data.folder}/${data.firstName}/${Date.now()}_${file.originalname}`;
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    }

    // Remove folder from data before saving to DB
    delete data.folder;
    delete data.status;
    delete data.form_no;
    delete data.exams;

    // Convert any number fields if needed
    if (data.student_id) data.student_id = parseInt(data.student_id);

    // UPDATE: If student_id is present
    if (data.student_id) {
      delete data._id;
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      if (url) {
        updateData.imageUrl = url;
      }

      // Remove empty or undefined fields
      Object.keys(updateData).forEach(
        (key) =>
          (updateData[key] === "" || updateData[key] === undefined) &&
          delete updateData[key]
      );

      const result = await classesdb
        .collection("students")
        .updateOne({ student_id: data.student_id }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ message: "Student not found for update" });
      }

      return res.status(200).json({
        message: "Student updated successfully",
        updated: result.modifiedCount,
      });
    }

    // ADD: If student_id not present, add a new student
    const Laststudent = await classesdb
      .collection("students")
      .findOne({}, { sort: { student_id: -1 } });

    const student_id = Laststudent ? Laststudent.student_id + 1 : 100001;

    const LastForm = await classesdb
      .collection("form")
      .findOne({}, { sort: { form_no: -1 } });

    const form_no = LastForm ? LastForm.form_no + 1 : 101;

    const LastReceipt = await classesdb
      .collection("form")
      .findOne({}, { sort: { form_no: -1 } });

    const receiptno = LastReceipt ? LastReceipt.receiptno + 1 : 101;

    const receiptdata = {
      receiptno: receiptno,
      student_id: data.student_id,
      firstName: data.firstName,
      lastName: data.lastName,
      course: data.course,
      totalPayment: parseInt(data.totalPayment),
      discount: parseInt(data.discount),
      payment: parseInt(data.payment),
      paymentmode: data.paymentmode,
      createdAt: new Date(),
    };

    await classesdb.collection("receipts").insertOne(receiptdata);

    const receiptformat = await classesdb.collection("receiptformat").find({}).toArray();

    await generateReceipt(receiptdata, receiptformat[0], "./generated_bills");

    delete data.paymentmode;
    if (data?.chequeNo) {
      delete data.chequeNo;
    }

    const newStudent = {
      ...data,
      student_id,
      form_no,
      imageUrl: url,
      status: true,
      createdAt: new Date(),
    };

    const result = await classesdb.collection("students").insertOne(newStudent);

    return res.status(201).json({
      message: "Student added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    logger.error("Error Adding/Updating Student:", error);
    return res.status(500).json({ message: "Failed to add or update student" });
  }
};

export const AddMultipleStudents = async (req, res) => {
  try {
    const { students, db } = req.body.payload;

    if (!Array.isArray(students) || students.length === 0 || !db) {
      return res.status(400).json({
        message: "Required Fields are Missing",
      });
    }

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    // Get the last student_id
    const LastStudent = await classesdb
      .collection("students")
      .findOne({}, { sort: { student_id: -1 }, projection: { student_id: 1 } });

    let nextStudentId = LastStudent ? LastStudent.student_id + 1 : 100001;

    // Get the last form_no
    const LastForm = await classesdb
      .collection("form")
      .findOne({}, { sort: { form_no: -1 }, projection: { form_no: 1 } });

    let nextFormNo = LastForm ? LastForm.form_no + 1 : 101;

    // Map and prepare students with incremented IDs
    const studentsToInsert = students.map((student) => {
      const newStudent = {
        ...student,
        student_id: nextStudentId++,
        form_no: nextFormNo++,
        status: true, // optional: default to active
      };
      return newStudent;
    });

    // Insert all students at once
    await classesdb.collection("students").insertMany(studentsToInsert);

    return res.status(200).json({
      message: "Students added successfully",
      insertedCount: studentsToInsert.length,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

export const GetStudents = async (req, res) => {
  try {
    const { db } = req.query;

    if (!db) {
      return res.status(400).json({
        message: "Rquired Field is Missing",
      });
    }

    const database = mongoose.connection;

    // Switching Database
    const classesdb = database.useDb(db, { useCache: true });

    const students = await classesdb
      .collection("students")
      .find({ status: true })
      .toArray();

    if (!students || students.length === 0) {
      return res.status(404).json({
        message: "No Students Found",
      });
    }

    return res.status(200).json({
      payload: students,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const DeleteStudent = async (req, res) => {
  try {
    const { student_id, db } = req.body.payload;

    if (!student_id || !db) {
      return res.status(400).json({
        message: "Required Fields are Missing",
        status: false,
      });
    }

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    const result = await classesdb
      .collection("students")
      .updateOne({ student_id }, { $set: { status: false } });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Student not found",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Deleted Successfully",
      status: true,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Server Error",
      status: false,
    });
  }
};
