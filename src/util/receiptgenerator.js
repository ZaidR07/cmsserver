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

    const htmlContent = receiptformat.template
      .replace('${data.logo}', data.logo)
      .replace('${data.companyName}', data.companyName)
      .replace('${data.highlight}', data.highlight)
      .replace('${data.contact}', data.contact)
      .replace('${data.altContact}', data.altContact)
      .replace('${data.address}', data.address)
      .replace('${data.receiptno}', data.receiptno)
      .replace('${formatToDDMMYYYY(data.createdAt)}', formatToDDMMYYYY(data.createdAt))
      .replace('${data.firstName}', data.firstName)
      .replace('${data.lastName}', data.lastName)
      .replace('${numberToWords(data.payment)}', numberToWords(data.payment))
      .replace('${data.paymentmode === "Cash" ? "checked" : ""}', data.paymentmode === "Cash" ? "checked" : "")
      .replace('${data.paymentmode === "Cash" ? "✓" : ""}', data.paymentmode === "Cash" ? "✓" : "")
      .replace('${data.paymentmode === "UPI" ? "checked" : ""}', data.paymentmode === "UPI" ? "checked" : "")
      .replace('${data.paymentmode === "UPI" ? "✓" : ""}', data.paymentmode === "UPI" ? "✓" : "")
      .replace('${data.paymentmode === "Cheque" ? "checked" : ""}', data.paymentmode === "Cheque" ? "checked" : "")
      .replace('${data.paymentmode === "Cheque" ? "✓" : ""}', data.paymentmode === "Cheque" ? "✓" : "")
      .replace('${data.chequeNo}', data.chequeNo || "")
      .replace('${data.balance}', data.balance)
      .replace('${notesHTML}', notesHTML)
      .replace('${data.signature}', data.signature)
      .replace('${data.headerBackground}', data.headerBackground)
      .replace('${data.headerColor}', data.headerColor)
      .replace('${data.secondHeaderBackground}', data.secondHeaderBackground);

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
        html: `<p>Hi ${data.firstName},</p><p>Thank you for your payment. You can download your receipt from the link below:</p><p><a href="${receiptUrl}">Download Receipt</a></p><p>Regards,<br>${data.companyName} Team</p>`,
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