import puppeteer from "puppeteer";
import { writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generates and saves a certificate PDF based on provided data and HTML template
 * @param {Object} options - Configuration options
 * @param {Object} options.certificateData - Data to populate the certificate template
 * @param {string} options.template - HTML template with {{placeholders}} for data
 * @param {string} [options.outputPath] - Where to save the PDF (defaults to 'certificate.pdf' in current dir)
 * @returns {Promise<string>} Path where the PDF was saved
 */
const generateCertificate = async ({
  certificateData,
  template,
  outputPath = join(__dirname, "certificate.pdf"),
}) => {
  // Validate inputs
  if (!certificateData || typeof certificateData !== "object") {
    throw new Error("certificateData must be an object");
  }
  if (!template || typeof template !== "string") {
    throw new Error("template must be a string containing HTML");
  }

  // Interpolate template with data
  const interpolateTemplate = (template, data) => {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  };

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794 });

    // Insert data into template
    const htmlContent = interpolateTemplate(template, certificateData);

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate PDF in landscape mode
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: {
        top: "0.2in",
        right: "0.2in",
        bottom: "0.2in",
        left: "0.2in",
      },
    });

    // Save to file
    await writeFile(outputPath, pdfBuffer);
    console.log(`Certificate PDF saved to: ${outputPath}`);
    return outputPath;
  } finally {
    await browser.close();
  }
};

// Example usage (commented out)

const exampleUsage = async () => {
  const certificateData = {
    companyName: "AICI Computer Institute",
    studentName: "Komal Gupta",
    performance: "Excellent",
    courseName: "Advance Tally",
    location: "Nallasopara East",
    grade: "A+",
    date: "May 2024",
    percentage: "96%",
    contactNo: "82911 22035",
    email: "aicicomputerinstitute@gmail.com",
  };

  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Times New Roman', serif;
                background: linear-gradient(135deg, #2c5f7a 0%, #1a3d52 100%);
                padding: 20px;
                width: 100vw;
                height: 100vh;
                overflow: hidden;
            }

            .certificate-wrapper {
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #2c5f7a 0%, #1a3d52 100%);
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .decorative-corner {
                position: absolute;
                width: 120px;
                height: 120px;
                background: linear-gradient(45deg, #f4b942, #e6a635);
            }

            .corner-top-left {
                top: 0;
                left: 0;
                clip-path: polygon(0 0, 100% 0, 0 100%);
            }

            .corner-top-right {
                top: 0;
                right: 0;
                clip-path: polygon(100% 0, 100% 100%, 0 0);
            }

            .corner-bottom-left {
                bottom: 0;
                left: 0;
                clip-path: polygon(0 0, 100% 100%, 0 100%);
            }

            .corner-bottom-right {
                bottom: 0;
                right: 0;
                clip-path: polygon(100% 0, 100% 100%, 0 100%);
            }

            .certificate-main {
                width: calc(100% - 40px);
                height: calc(100% - 40px);
                background: white;
                border: 8px solid #f4b942;
                position: relative;
                box-shadow: 0 0 20px rgba(0,0,0,0.3);
            }

            .certificate-inner {
                width: calc(100% - 20px);
                height: calc(100% - 20px);
                margin: 10px;
                border: 2px solid #2c5f7a;
                padding: 30px;
                position: relative;
                background: white;
                overflow: hidden;
            }

            .watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-25deg);
                font-size: 120px;
                font-weight: bold;
                color: rgba(44, 95, 122, 0.08);
                font-family: 'Arial', sans-serif;
                letter-spacing: 8px;
                z-index: 1;
                pointer-events: none;
                white-space: nowrap;
                text-transform: uppercase;
            }

            .certificate-content {
                position: relative;
                z-index: 2;
                background: transparent;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
            }

            .logo-section {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .main-logo {
                text-align: center;
            }

            .it-expert {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .govt-recognized {
                font-size: 10px;
                margin-bottom: 10px;
            }

            .aici-text {
                font-size: 48px;
                font-weight: bold;
                color: #e74c3c;
                line-height: 1;
                margin-bottom: 5px;
            }

            .computer-institute {
                font-size: 16px;
                font-weight: bold;
                color: black;
                margin-bottom: 3px;
            }

            .iso-certified {
                background: #e74c3c;
                color: white;
                font-size: 10px;
                padding: 2px 8px;
                font-weight: bold;
            }

            .right-logos {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .digital-india {
                width: 60px;
                height: 40px;
                background: linear-gradient(45deg, #ff6b35, #ff8e3c, #4ecdc4);
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 8px;
                font-weight: bold;
                text-align: center;
            }

            .iso-badge {
                width: 50px;
                height: 50px;
                background: radial-gradient(circle, #f4b942, #d4a235);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: black;
                font-size: 8px;
                font-weight: bold;
                text-align: center;
                border: 2px solid #b8941e;
            }

            .wswe-logo {
                font-size: 24px;
                font-weight: 900;
                color: black;
                letter-spacing: 2px;
            }

            .title {
                text-align: center;
                font-size: 42px;
                color: #2c5f7a;
                font-weight: bold;
                margin-bottom: 40px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }

            .content {
                margin-bottom: 30px;
                line-height: 2.5;
                font-size: 16px;
            }

            .field-value {
                color: #6b46c1;
                font-weight: bold;
                font-style: italic;
            }

            .dotted-line {
                border-bottom: 2px dotted #666;
                display: inline-block;
                min-width: 200px;
                margin: 0 10px;
            }

            .bottom-section {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: 40px;
                position: relative;
            }

            .seal {
                width: 80px;
                height: 80px;
                background: radial-gradient(circle, #f4b942, #d4a235);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                text-align: center;
                color: black;
                border: 3px solid #b8941e;
                position: relative;
            }

            .seal::before {
                content: "★ ★ ★";
                position: absolute;
                bottom: 15px;
                font-size: 8px;
            }

            .signatures {
                text-align: center;
                flex: 1;
                margin: 0 40px;
            }

            .signature-line {
                border-bottom: 2px dashed #666;
                margin: 20px 60px;
                height: 1px;
            }

            .signature-text {
                font-size: 14px;
                margin-top: 10px;
            }

            .student-photo {
                width: 80px;
                height: 100px;
                border: 2px solid #2c5f7a;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #666;
            }

            .contact-info {
                text-align: center;
                font-size: 14px;
                margin-top: 20px;
                font-weight: bold;
            }

            .email-link {
                color: #2563eb;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="certificate-wrapper">
            <div class="decorative-corner corner-top-left"></div>
            <div class="decorative-corner corner-top-right"></div>
            <div class="decorative-corner corner-bottom-left"></div>
            <div class="decorative-corner corner-bottom-right"></div>
            
            <div class="certificate-main">
                <div class="certificate-inner">
                    <div class="watermark">AICI COMPUTER INSTITUTE</div>
                    
                    <div class="certificate-content">
                        <div class="header">
                        <div class="logo-section">
                            <div class="main-logo">
                                <div class="it-expert">IT Expert Trainer</div>
                                <div class="govt-recognized">(Govt. Recognized)</div>
                                <div class="aici-text">AICI</div>
                                <div class="computer-institute">COMPUTER INSTITUTE</div>
                                <div class="iso-certified">AN ISO 9001:2015 CERTIFIED COMPANY</div>
                            </div>
                        </div>
                        
                        <div class="right-logos">
                            <div class="digital-india">Digital<br>India</div>
                            <div class="iso-badge">ISO<br>9001:2015</div>
                            <div class="wswe-logo">WSWE</div>
                        </div>
                    </div>

                    <div class="title">Certificate of Completion</div>

                    <div class="content">
                        <div>This is to certify that Mr./Ms. <span class="field-value dotted-line">${certificateData.studentName}</span></div>
                        
                        <div>and having found the candidate performance <span class="field-value dotted-line">${certificateData.performance}</span></div>
                        
                        <div>for successful completed of course <span class="field-value dotted-line">${certificateData.courseName}</span></div>
                        
                        <div>at <span class="field-value dotted-line">${certificateData.location}</span> Over all grade <span class="field-value dotted-line">${certificateData.grade}</span></div>
                        
                        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                            <div>Month of Issue <span class="field-value dotted-line">${certificateData.date}</span></div>
                            <div>Percentage <span class="field-value dotted-line">${certificateData.percentage}</span></div>
                        </div>
                    </div>

                    <div class="bottom-section">
                        <div class="seal">
                            <div>
                                COMPUTER<br>
                                MUMBAI<br>
                                INDIA
                            </div>
                        </div>
                        
                        <div class="signatures">
                            <div class="signature-line"></div>
                            <div class="signature-text">Center Manager</div>
                            <div class="signature-line"></div>
                            <div class="signature-text">(${certificateData.companyName})</div>
                        </div>
                        
                        <div class="student-photo">
                            Student<br>Photo
                        </div>
                    </div>

                        <div class="contact-info">
                            Contact no. ${certificateData.contactNo || "82911 22035"}, Email Id.: <a href="mailto:${certificateData.email || "aicicomputerinstitute@gmail.com"}" class="email-link">${certificateData.email || "aicicomputerinstitute@gmail.com"}</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

  try {
    await generateCertificate({
      certificateData,
      template: htmlTemplate,
      outputPath: join(__dirname, "my-certificate.pdf"),
    });
  } catch (error) {
    console.error("Failed to generate certificate:", error);
  }
};

exampleUsage();

export default generateCertificate;
