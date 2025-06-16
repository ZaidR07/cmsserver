import puppeteer from "puppeteer";
import { formatToDDMMYYYY } from "./DateConverter.js";
import s3Client from "./s3Client.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Resend } from "resend";

const resend = new Resend("re_ccuAZtfq_qWsMFDrWjLSwX1vt6qm5GFCp");

export const generateReceipt = async (
  billData = {},
  receiptformat = {},
  previousreceipts
) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const data = { ...billData, ...receiptformat };

    function numberToWords(num) {
      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
      ];
      const teens = [
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];
      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
      ];

      if (num === 0) return "Zero";

      function convertHundreds(n) {
        let result = "";
        if (n >= 100) {
          result += ones[Math.floor(n / 100)] + " Hundred ";
          n %= 100;
        }
        if (n >= 20) {
          result += tens[Math.floor(n / 10)] + " ";
          n %= 10;
        } else if (n >= 10) {
          result += teens[n - 10] + " ";
          return result;
        }
        if (n > 0) {
          result += ones[n] + " ";
        }
        return result;
      }

      if (num < 1000) {
        return convertHundreds(num).trim();
      } else if (num < 100000) {
        return (
          convertHundreds(Math.floor(num / 1000)) +
          "Thousand " +
          convertHundreds(num % 1000)
        );
      } else if (num < 10000000) {
        return (
          convertHundreds(Math.floor(num / 100000)) +
          "Lakh " +
          convertHundreds(Math.floor((num % 100000) / 1000)) +
          "Thousand " +
          convertHundreds(num % 1000)
        );
      } else {
        return (
          convertHundreds(Math.floor(num / 10000000)) +
          "Crore " +
          convertHundreds(Math.floor((num % 10000000) / 100000)) +
          "Lakh " +
          convertHundreds(Math.floor((num % 100000) / 1000)) +
          "Thousand " +
          convertHundreds(num % 1000)
        );
      }
    }

    const notesHTML = data.notes
      .map(
        (note) =>
          `<p style="font-size: 16px; color: #374151; margin: 0 0 4px;">${note}</p>`
      )
      .join("");

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AICI Computer Institute Bill</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: white;
            }
            
            .bill-container {
                max-width: 800px;
                margin: 0 auto;
                border: 2px solid #000;
                background-color: white;
            }
            
            .header {
              
              padding: 10px;
              border-bottom: 2px solid #000;
            }

            
            .header img {
                max-width: 100%;
                height: auto;
            }
            
            .header-text {
            display: flex;
              justify-content: center;
              gap: 5%;
                background-color: ${data.headerBackground};
                color: ${data.headerColor};
                padding: 15px;
                margin: 10px 0;
                font-weight: bold;
                font-size: 20px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .logo{
              width : 20%;
              max-height : 20vw;
            }

            .signatureimg{
              width : 20%;
              max-height : 20vw;
            }
            
            .institute-info {
                 background-color: ${data.secondHeaderBackground};
                color: white;
                padding: 8px;
                font-size: 12px;
                text-align: center;
            }
            
            .contact-info {
                background-color: #f0f0f0;
                padding: 8px;
                font-size: 12px;
                text-align: center;
                border-bottom: 1px solid #ccc;
            }
            
            .receipt-header {
                display: flex;
                justify-content: space-between;
                padding: 15px;
                font-weight: bold;
                border-bottom: 1px solid #ccc;
            }
            
            .form-section {
                padding: 20px;
            }
            
            .form-row {
                display: flex;
                margin-bottom: 15px;
                align-items: center;
            }
            
            .form-label {
                font-weight: bold;
                margin-right: 10px;
                min-width: 150px;
            }
            
            .form-input {
                border: none;
                border-bottom: 1px solid #000;
                padding: 5px;
                flex: 1;
                margin-right: 20px;
            }
            
            .payment-section {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 15px;
            }
            
            .payment-method {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .checkbox {
                width: 15px;
                height: 15px;
                border: 1px solid #000;
                display: inline-block;
                text-align: center;
                line-height: 13px;
                font-size: 12px;
            }
            
            .checked {
                background-color: #000;
                color: white;
            }
            
            .amount-section {
                text-align: right;
                margin-top: 20px;
            }
            
            .fee-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }
            
            .fee-table th,
            .fee-table td {
                border: 1px solid #000;
                padding: 8px;
                text-align: center;
            }
            
            .fee-table th {
                background-color: #f0f0f0;
                font-weight: bold;
            }
            
            .note-section {
                margin-top: 20px;
                font-size: 16px;
            }
            
            .signature-section {
                width : 20%;
                margin-left: 75%;
                text-align: center;
                
               
            }
            
            .balance-due {
                background-color: #fffacd;
                padding: 10px;
                border: 1px solid #ddd;
                margin-top: 15px;
                text-align: right;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="bill-container">
                <div class='header'>
    <div class='header-text'>
        <img class = 'logo' src='${data.logo}' alt='logo' /> 
      <h1>${data.companyName}</h1>
    </div>
    <div class='institute-info'>${data.highlight}</div>
    <div class='contact-info'>
      Contact&nbsp;: ${data.contact}&nbsp;&nbsp;/&nbsp;&nbsp;${data.altContact}<br>
      Address: ${data.address}
    </div>
  </div>
            
            
            <div class="receipt-header">
                <div>Receipt No: ${data.receiptno}</div>
                <div>Date: ${formatToDDMMYYYY(data.createdAt)}</div>
            </div>
            
            <div class="form-section">
                <div class="form-row">
                    <span class="form-label">Received with thanks from:</span>
                    <span class="form-input">${data.firstName} ${
                      data.lastName
                    }</span>
                </div>
                
                <div class="form-row">
                    <span class="form-label">the sum of Rupees:</span>
                    <span class="form-input">${numberToWords(
                      data.payment
                    )} Only</span>
                </div>
                
                <div class="payment-section">
                    <span class="form-label">Paid by:</span>
                    <div class="payment-method">
                        <span class="checkbox ${data.paymentmode === "Cash" ? "checked" : ""}">
                            ${data.paymentmode === "Cash" ? "✓" : ""}
                        </span>
                        <span>Cash</span>
                    </div>
                    <div class="payment-method">
                        <span class="checkbox ${data.paymentmode === "UPI" ? "checked" : ""}">
                            ${data.paymentmode === "UPI" ? "✓" : ""}
                        </span>
                        <span>UPI</span>
                    </div>
                    <div class="payment-method">
                        <span class="checkbox ${data.paymentmode === "Cheque" ? "checked" : ""}">
                            ${data.paymentmode === "Cheque" ? "✓" : ""}
                        </span>
                        <span>Cheque</span>
                    </div>
                    <div class="payment-method">
                        <span>No:</span>
                        <span class="form-input" style="width: 100px;">${data.chequeNo || ""}</span>
                    </div>
                </div>
                
                <div class='balance-due'>
  <strong>Balance Due: ₹${data.totalPayment - data.discount - data.payment}</strong>
</div>

                
                <div class="note-section" style="margin-top: 1.5rem;">
                  <strong>Note:</strong>
                  <div style="margin-left:10px">
                    ${notesHTML}
                  </div>
    
                </div>

                
                <div class="signature-section">
                    <img class = 'signatureimg' src='${data.signature}' alt='signature image' />
                    <hr/>
                    <strong>Authorized&nbsp;Signature</strong>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

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

    const fileKey = `${data.folder}/${data.firstName}/${Date.now()}_Receipt.pdf`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const receiptUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const emailheader = data.companyName.trim(); // Trim to avoid extra spaces

    try {
      await resend.emails.send({
        from: `${emailheader} <no-reply@t-rexinfotech.in>`,
        to: [data.email],
        subject: "Your Payment Receipt",
        html: `<p>Hi ${data.firstName},</p><p>Thank you for your payment. You can download your receipt from the link below:</p><p><a href="${receiptUrl}">Download Receipt</a></p><p>Regards,<br>AICI Team</p>`,
      });
      console.log("Email sent successfully");
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error; // Rethrow or handle as needed
    }

    return receiptUrl;
  } finally {
    await browser.close();
  }
};
