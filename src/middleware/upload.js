import multer from "multer";

// Configure multer to use memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Export the configuration for Next.js API routes
export const config = {
  api: {
    bodyParser: false, // Disable the default body parser to handle multipart/form-data
  },
};

// Dynamic middleware to handle single or multiple file uploads
const uploadMiddleware = (req, res, next) => {
  const uploadType = req.query.uploadType || req.body.uploadType;

  if (uploadType === "single") {
    upload.single("")(req, res, next);
  } else if (uploadType === "multiple") {
    upload.fields([
    
    ])(req, res, next);
  } else {
    return res.status(400).json({ message: "Invalid upload type" });
  }
};

// Export the dynamic middleware
export default uploadMiddleware;