import puppeteer from "puppeteer";
import s3Client from "./s3Client.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { formatToDDMMYYYY } from "./DateConverter.js";
import mongoose from "mongoose";

const generateCertificate = async ({ certificateData, template, db }) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Generate certificate ID
    const certificateId =
      new Date().getTime().toString() +
      Math.floor(Math.random() * 1000).toString();

    // Process template with actual data
    const interpolateTemplate = (template, data) => {
      return template
        .replace(/\${certificateData\.(\w+)}/g, (match, key) => {
          return data[key] || "";
        })
        .replace(/\${(\w+)}/g, (match, key) => {
          return data[key] || "";
        });
    };

    certificateData.certificateId = certificateId;

    const htmlContent = interpolateTemplate(template, certificateData);
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    // Ensure print CSS and web fonts are fully loaded before PDF
    await page.emulateMediaType('print');
    try {
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      });
    } catch (_) {
      // ignore if fonts API not available
    }
    // small extra delay to be safe (compatible across Puppeteer versions)
    await new Promise(resolve => setTimeout(resolve, 150));

    const height = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });

    const pdfBuffer = await page.pdf({
      width: "800px",
      height: `${height + 50}px`,
      printBackground: true,
      pageRanges: "1",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    // Generate S3 file path
    const timestamp = Date.now();
    const sanitizedName = certificateData.studentName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    );
    const fileKey = `certificates/${sanitizedName}/${certificateId}.pdf`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const certificateUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Prepare certificate document
    const certificateDoc = {
      certificateId,
      studentName: certificateData.studentName,
      performance: certificateData.performance,
      courseName: certificateData.courseName,
      location: certificateData.location,
      grade: certificateData.grade,
      issueDate: certificateData.date,
      percentage: certificateData.percentage,
      studentPhoto: certificateData.studentphoto,
      certificateUrl,
      createdAt: new Date(),
      examId: certificateData.examId,
      studentId: certificateData.studentId
    };

    const database = mongoose.connection;

    // Save to MongoDB using the provided db connection
    const classesdb = database.useDb(db, { useCache: true });

    await classesdb.collection("certificates").insertOne(certificateDoc);

    return {
      success: true,
      certificateId,
      certificateUrl,
      data: certificateDoc,
    };

  } catch (error) {
    console.error("Certificate generation error:", error);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await browser.close();
  }
};

export default generateCertificate;
