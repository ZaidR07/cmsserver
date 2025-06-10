import { Router } from "express";
import { AdminLogin } from "./controllers/login.js";
// import { CheckUser } from "./middleware/auth.js";
import { addAdmin } from "./controllers/admin.js";
import { AddMultipleStudents, AddUpdateStudent, DeleteStudent, GetStudents } from "./controllers/student.js";
import multer from "multer";
import { CreateExam, getExams, studentExamLogin, studentExamSubmit } from "./controllers/exams.js";
import { AddCourse, GetCourses } from "./controllers/courses.js";

// Initialize multer for file uploads
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory


const approuter = Router();

approuter.post("/api/adminlogin",AdminLogin);
approuter.post("/api/createadmin",addAdmin);

//Student Routes
approuter.post("/api/addupdatestudent", upload.single("photo"), AddUpdateStudent );
approuter.get("/api/getstudents",GetStudents);
approuter.post("/api/deletestudent", DeleteStudent);
approuter.post("/api/addmultiplestudents", AddMultipleStudents);

//Exams Routes
approuter.post("/api/createexam" , CreateExam);
approuter.get("/api/getexams" , getExams);
approuter.post("/api/studentexamlogin",studentExamLogin)

//Courses Routes
approuter.post("/api/addupdatecourse", upload.single("image"), AddCourse);
approuter.get("/api/getcourses" , GetCourses);
approuter.post("/api/studentexamsubmit" , studentExamSubmit);




export default approuter;