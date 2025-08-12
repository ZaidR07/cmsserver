import mongoose from "mongoose";
import { formatToDDMMYYYY } from "../util/DateConverter.js";
import generateCertificate from "../util/Generatecertificate.js";
import axios from "axios";
import PDFMerger from "pdf-merger-js";
import os from "os";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import stream from "stream";
import { logger } from "../logger.js";

const calculatePerformance = (score) => {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 40) return "Satisfactory";
  return "Fail";
};

const calculateGrade = (score) => {
  if (score >= 90) return "O";
  if (score >= 80) return "A+";
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "F";
};



export const GenerateCertificates = async (req, res) => {
  try {
    const { students, exam_id, db } = req.body;

    if (!students || !exam_id || !db) {
      return res
        .status(400)
        .json({ status: false, message: "Missing required data" });
    }

    const studentList = Array.isArray(students) ? students : [students];

    const mainDb = mongoose.connection;
    const classesdb = mainDb.useDb(db, { useCache: true });

    const companyinfo = await classesdb
      .collection("certificateformat")
      .findOne({});
    const examdetails = await classesdb
      .collection("exams")
      .findOne({ exam_id });

    if (!examdetails || !companyinfo) {
      return res
        .status(404)
        .json({ status: false, message: "Company or exam not found" });
    }

    const certificatesArray = [];

    const results = await Promise.all(
      studentList.map(async (studentId) => {
        try {
          const studentdata = await classesdb
            .collection("students")
            .findOne({ student_id: studentId });

          if (!studentdata) {
            return { success: false, studentId, message: "Student not found" };
          }

          if (!Array.isArray(studentdata.exams)) {
            return {
              success: false,
              studentId,
              message: "Student has no exam data",
            };
          }

          const examInfo = studentdata.exams.find((e) => e.exam_id === exam_id);
          if (!examInfo) {
            return {
              success: false,
              studentId,
              message: "Student didn't take this exam",
            };
          }

          const fullName = [
            studentdata.firstName,
            studentdata.middleName,
            studentdata.lastName,
          ]
            .filter(Boolean)
            .join(" ");

          // Build HTML rows for descriptions (at least 8 rows)
          const descriptionsArr = Array.isArray(examdetails.descriptions)
            ? examdetails.descriptions
            : [];
          const descRows = descriptionsArr.slice(0, 8).map((d) =>
            `<tr><td>${d}</td><td></td><td></td></tr>`
          );
          while (descRows.length < 8) {
            descRows.push(`<tr><td>&nbsp;</td><td></td><td></td></tr>`);
          }
          const descriptionsRows = descRows.join("");

          

          const certificateData = {
            companyName: companyinfo.companyName,
            studentName: fullName,
            performance: calculatePerformance(examInfo.score),
            courseName: examdetails.exam_name,
            location: companyinfo.address,
            grade: calculateGrade(examInfo.score),
            date: formatToDDMMYYYY(examdetails.createdAt),
            percentage: examInfo.score + "%",
            contactNo: companyinfo.contact,
            email: companyinfo.email || "",
            signature: companyinfo.signature,
            associates: companyinfo.associates,
            logo: companyinfo.logo,
            studentphoto: studentdata.imageUrl,
            exam_id,
            studentId,
            descriptionsRows,
          };

          const data = await generateCertificate({
            certificateData,
            template: companyinfo.template,
            db,
          });

          // Push to certificates array
          certificatesArray.push({
            student_id: studentId,
            certificate_id: data.certificateId,
            certificate_url: data.certificateUrl,
          });

          return {
            success: true,
            studentId,
            certificatePath: data.certificateUrl,
            certificateId: data.certificateId,
          };
        } catch (error) {
          return {
            success: false,
            studentId,
            error: error.message,
          };
        }
      })
    );

    // Store all certificates in one document
    await classesdb.collection("certificate_requests").insertOne({
      exam_id,
      db,
      createdAt: new Date(),
      certificates: certificatesArray,
    });

    return res.status(200).json({
      status: true,
      message: "Certificates processed and saved",
      results,
    });
  } catch (error) {
    console.error("Error generating certificates:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const GetCertificateRequests = async (req, res) => {
  try {
    const { db } = req.query;

    if (!db) {
      return res.status(400).json({
        message: "Required Field is Missing",
      });
    }

    const database = mongoose.connection;

    // Switching Database
    const classesdb = database.useDb(db, { useCache: true });

    const certificaterequests = await classesdb
      .collection("certificate_requests")
      .find({})
      .sort({ createdAt: -1 }) 
      .toArray();
      
    if (certificaterequests.length === 0) {
      return res.status(404).json({
        message: "No Certificate Requests Found",
      });
    }

    return res.status(200).json({
      payload: certificaterequests,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const pipeline = promisify(stream.pipeline);

// Utility function to get/create temp directory
const getTempDir = () => {
  const tempDir = path.join(os.tmpdir(), "certificates");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

export const DownloadCertificates = async (req, res) => {
  const tempDir = getTempDir();
  const tempFiles = []; // To track temp files for cleanup

  try {
    const { certificate_ids, db } = req.body;

    if (!certificate_ids || !Array.isArray(certificate_ids)) {
      return res.status(400).json({ message: "Invalid certificate IDs" });
    }

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    // 1. Fetch all certificates from the database
    const certificates = await classesdb
      .collection("certificates")
      .find({ certificateId: { $in: certificate_ids } })
      .toArray();

    if (certificates.length === 0) {
      return res.status(404).json({ message: "No certificates found" });
    }

    const merger = new PDFMerger();
    let successCount = 0;

    // 2. Download and process each certificate
    for (const cert of certificates) {
      if (!cert.certificateUrl) continue;

      const tempFilePath = path.join(
        tempDir,
        `cert_${cert.certificateId}_${Date.now()}.pdf`
      );
      tempFiles.push(tempFilePath);

      try {
        // Download the PDF
        const response = await axios({
          method: "get",
          url: cert.certificateUrl,
          responseType: "stream",
          timeout: 30000, // 30 second timeout
        });

        // Save to temp file
        const writer = fs.createWriteStream(tempFilePath);
        await pipeline(response.data, writer);

        // Add to merger
        await merger.add(tempFilePath);
        successCount++;
      } catch (error) {
        console.error(
          `Error processing certificate ${cert.certificateId}:`,
          error.message
        );
        continue;
      }
    }

    if (successCount === 0) {
      return res
        .status(500)
        .json({ message: "Failed to process any certificates" });
    }

    // 3. Send the merged PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=certificates_${Date.now()}.pdf`
    );

    const mergedPdf = await merger.saveAsBuffer();
    res.send(mergedPdf);
  } catch (error) {
    console.error("Error in DownloadCertificates:", error);
    res.status(500).json({
      message: "Failed to download certificates",
      error: error.message,
    });
  } finally {
    // 4. Clean up temp files
    tempFiles.forEach((file) => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", file, cleanupError);
      }
    });
  }
};

export const SeeCertificate = async (req, res) => {
  try {
    const { certificateId, db } = req.body;

    const database = mongoose.connection;
    const classesdb = database.useDb(db, { useCache: true });

    // 1. Fetch all certificates from the database
    const certificate = await classesdb
      .collection("certificates")
      .findOne({ certificateId: certificateId });

    if (!certificate) {
      return res.status(404).json({
        message: "No Certificate Found",
      });
    }

    return res.status(200).json({
      message: "Certificate Successfully Fetched",
      certificateUrl: certificate.certificateUrl,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};






