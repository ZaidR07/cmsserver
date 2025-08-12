import { Router } from "express";
import { AdminLogin } from "./controllers/login.js";
// import { CheckUser } from "./middleware/auth.js";
import {
  addOrUpdateAdmin,
  deleteAdmin,
  getAdmins,
  SendForgotPasswordOtp,
  VerifyOtpResetPassword,
} from "./controllers/admin.js";
import {
  AddMultipleStudents,
  AddUpdateStudent,
  DeleteStudent,
  GetPreviousYearsStudent,
  GetStudents,
} from "./controllers/student.js";
import multer from "multer";
import {
  CreateExam,
  getExamParticipants,
  getExams,
  studentExamLogin,
  studentExamSubmit,
} from "./controllers/exams.js";
import { AddCourse, DeleteCourse, GetCourses } from "./controllers/courses.js";
import {
  AddUpdateReceipt,
  GetReceiptFormat,
} from "./controllers/receiptformat.js";
import { AddUpdateCertificateFormat } from "./controllers/certificateformat.js";
import {
  CloseEnquiry,
  CreateEnquiry,
  GetEnquiry,
} from "./controllers/enquiry.js";
import {
  GetFeeHistoryofstudent,
  getPendingFeePerCourse,
  PayFees,
} from "./controllers/fee.js";
import { getDashboardNumbers } from "./controllers/dashboard.js";
import { addVisitor, getVisitorNumbers } from "./controllers/visitor.js";
import { PrintReceipt, ResendReceipt } from "./controllers/receipt.js";
import { AddExemption } from "./controllers/exemption.js";
import { DownloadCertificates, GenerateCertificates, GetCertificateRequests, SeeCertificate } from "./controllers/certificate.js";

// Initialize multer for file uploads
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

const approuter = Router();

approuter.post("/api/adminlogin", AdminLogin);
approuter.post("/api/addupdateadmin", addOrUpdateAdmin);
approuter.get("/api/getadmins", getAdmins);
approuter.post("/api/deleteadmin", deleteAdmin);
approuter.post("/api/forgotpassword", SendForgotPasswordOtp);
approuter.post("/api/verify-otp-reset-password", VerifyOtpResetPassword);

//Student Routes
approuter.post(
  "/api/addupdatestudent",
  upload.single("photo"),
  AddUpdateStudent
);
approuter.get("/api/getstudents", GetStudents);
approuter.post("/api/deletestudent", DeleteStudent);
approuter.post("/api/addmultiplestudents", AddMultipleStudents);

//Exams Routes
approuter.post("/api/createexam", CreateExam);
approuter.get("/api/getexams", getExams);
approuter.post("/api/studentexamlogin", studentExamLogin);
approuter.get("/api/getexamparticipants", getExamParticipants);
approuter.post("/api/studentexamsubmit", studentExamSubmit);
approuter.get("/api/getpreviousyearsstudents", GetPreviousYearsStudent);

//Courses Routes
approuter.post("/api/addupdatecourse", upload.single("image"), AddCourse);
approuter.get("/api/getcourses", GetCourses);
approuter.delete("/api/deletecourse", DeleteCourse);

//Receipt Routes
approuter.post(
  "/api/addupdatereceipt",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  AddUpdateReceipt
);
approuter.get("/api/getreceiptformat", GetReceiptFormat);
approuter.post("/api/resendreceipt", ResendReceipt);
approuter.post("/api/printreceipt", PrintReceipt);

approuter.post(
  "/api/addupdatecertificatedata",
  // upload.fields([
  //   { name: "logo", maxCount: 1 },
  //   { name: "signature", maxCount: 1 },
  // ])
  AddUpdateCertificateFormat
);

// Enquiry
approuter.post("/api/Sendenquiry", CreateEnquiry);
approuter.get("/api/getenquiries", GetEnquiry);
approuter.put("/api/closeenquiry", CloseEnquiry);

// Fee Routes
approuter.get("/api/getpendingfeepercourse", getPendingFeePerCourse);
approuter.get("/api/getfeehistoryofstudent", GetFeeHistoryofstudent);
approuter.post("/api/payfees", PayFees);

// Dashboard Routes
approuter.get("/api/getdashboardnumbers", getDashboardNumbers);

// Visitor Routes
approuter.post("/api/addvisitors", addVisitor);
approuter.get("/api/getvisitorsnumber", getVisitorNumbers);
approuter.get("/api/getvisitornumbers", getVisitorNumbers);

//Exemptions
approuter.post("/api/addexemption", AddExemption);

//Certificates
approuter.post("/api/generatecertificate", GenerateCertificates);
approuter.get("/api/getcertificaterequests" , GetCertificateRequests);
approuter.post("/api/downloadcertificates", DownloadCertificates);
approuter.post("/api/seecertificate", SeeCertificate);



export default approuter;
