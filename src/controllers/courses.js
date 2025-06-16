import s3Client from "../util/s3Client.js";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import { logger } from "../logger.js";

export const AddCourse = async (req, res) => {
  try {
    const data = req.body;
    const file = req.file;

    const db = mongoose.connection;
    const classesdb = db.useDb(data.folder, { useCache: true });

    let url = null;

    // Handle file upload if file is present
    if (file) {
      const fileKey = `${data.folder}/${data.course_name}/${Date.now()}_${file.originalname}`;
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

    // Convert any number fields if needed
    if (data.course_id) data.course_id = parseInt(data.course_id);

    // UPDATE: If Course_id is present
    if (data.course_id) {
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
        .collection("courses")
        .updateOne({ course_id: data.course_id }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Course not found for update" });
      }

      return res.status(200).json({
        message: "Course updated successfully",
        updated: result.modifiedCount,
      });
    }

    // ADD: If course_id not present, add a new Course
    const LastCourse = await classesdb
      .collection("courses")
      .findOne({}, { sort: { course_id: -1 } });

    const course_id = LastCourse ? LastCourse.course_id + 1 : 100001;

    const newCourse = {
      ...data,
      course_id,
      imageUrl: url,
      createdAt: new Date(),
    };

    const result = await classesdb.collection("courses").insertOne(newCourse);

    return res.status(201).json({
      message: "Course added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    logger.error("Error Adding/Updating Course:", error);
    return res.status(500).json({ message: "Failed to add or update Course" });
  }
};

export const GetCourses = async (req, res) => {
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

    const courses = await classesdb.collection("courses").find({}).toArray();

    if (!courses || courses.length === 0) {
      return res.status(404).json({
        message: "No Courses Found",
      });
    }

    return res.status(200).json({
      payload: courses,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const DeleteCourse = async (req, res) => {
  try {
    const { course_id, db } = req.query;

    if (!course_id || !db) {
      return res.status(400).json({
        message: "Required Fields are Missing",
        status: false,
      });
    }

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    const result = await classesdb.collection("courses").deleteOne({ course_id: parseInt(course_id)  });

    // Check if a document was actually deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: `Course with course_id ${course_id} not found`,
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
