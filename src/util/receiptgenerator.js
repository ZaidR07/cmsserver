import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { formatToDDMMYYYY } from "./DateConverter.js";

export const generateReceipt = async (
  billData = {},
  receiptformat = {},
  outputPath = "./bills",
  previousreceipts
) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // const previousreceipts = await classesdb
    //       .collection("receipts")
    //       .find({
    //         student_id: data.student_id,
    //         course: data.course,
    //       })
    //       .sort({ createdAt: 1 }) // ascending order => earliest first
    //       .toArray();

    console.log(receiptformat);
    

    const page = await browser.newPage();

    // Merge provided data with defaults
    const data = { ...billData, ...receiptformat };

    // Helper function to convert numbers to words (Indian format)
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
                text-align: center;
                padding: 10px;
                border-bottom: 2px solid #000;
            }
            
            .header img {
                max-width: 100%;
                height: auto;
            }
            
            .header-text {
                background-color: ${data.headerBackground};
                color: ${data.headerColor};
                padding: 15px;
                margin: 10px 0;
                font-weight: bold;
                font-size: 24px;
                text-transform: uppercase;
                letter-spacing: 2px;
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
                font-size: 12px;
            }
            
            .signature-section {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ccc;
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
                <div class="header">
                    <div class="header-text">AICI COMPUTER INSTITUTE</div>
                    <div class="institute-info">AN ISO 9001:2015 CERTIFIED COMPANY</div>
                    <div class="contact-info">
                        Contact: 8209112035 / 7676804850<br>
                        Address: Shop No 411, 2nd Floor, Retail Shopping Complex Opp IIT Ram Bagh, Sector-4, Rohini, New Delhi - 110 085
                    </div>
                 </div>
            
            
            <div class="receipt-header">
                <div>No: ${data.receiptno}</div>
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
                
                <div class="balance-due">
                    <strong>Balance Due: ₹${data.totalPayment} - ${data.discount} - ${data.payment}</strong>
                </div>
                
                <div class="note-section">
                    <p><strong>Note:</strong> Cheque are Subject to Realization</p>
                    <p><em>Fees Paid once are not refundable / Transferable</em></p>
                </div>
                
                <div class="signature-section">
                    <strong>Authorized Signature</strong>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Calculate the height of the content
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

    // Generate PDF with dynamic height
    const pdf = await page.pdf({
      width: "800px", // Match your content width
      height: `${height + 50}px`, // Add some padding
      printBackground: true,
      pageRanges: "1",
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Generate filename based on student name and receipt number
    const filename = `AICI_Bill_${data.firstName.replace(/\s+/g, "_")}_${data.receiptno}.pdf`;
    const filePath = path.join(outputPath, filename);

    // Write PDF to file
    fs.writeFileSync(filePath, pdf);

    console.log(`PDF saved to: ${filePath}`);
    return filePath;
  } finally {
    await browser.close();
  }
};

// Example usage:
