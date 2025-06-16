import { Router } from "express";
import { AdminLogin } from "./controllers/login.js";
// import { CheckUser } from "./middleware/auth.js";
import { addAdmin } from "./controllers/admin.js";
import {
  AddMultipleStudents,
  AddUpdateStudent,
  DeleteStudent,
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
import { AddUpdateReceipt, GetReceiptFormat } from "./controllers/receiptformat.js";
import { AddUpdateCertificateFormat } from "./controllers/certificateformat.js";

// Initialize multer for file uploads
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

const approuter = Router();

approuter.post("/api/adminlogin", AdminLogin);
approuter.post("/api/createadmin", addAdmin);

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


//Courses Routes
approuter.post("/api/addupdatecourse", upload.single("image"), AddCourse);
approuter.get("/api/getcourses", GetCourses);
approuter.delete("/api/deletecourse", DeleteCourse);


approuter.post(
  "/api/addupdatereceipt",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  AddUpdateReceipt
);
approuter.get("/api/getreceiptformat" , GetReceiptFormat)

approuter.post(
  "/api/addupdatecertificatedata",
  // upload.fields([
  //   { name: "logo", maxCount: 1 },
  //   { name: "signature", maxCount: 1 },
  // ])
  AddUpdateCertificateFormat
 
);

export default approuter;
