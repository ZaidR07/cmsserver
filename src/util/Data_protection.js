import CryptoJS from "crypto-js";

export const encryptData = (data, secretKey) => {
  if (typeof data === "string" || typeof data === "object") {
    return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
  } else if (data instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const encryptedFile = CryptoJS.AES.encrypt(
          arrayBuffer,
          secretKey
        ).toString();
        resolve(encryptedFile);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(data);
    });
  } else {
    throw new Error("Unsupported data type");
  }
};

export const decryptData = (ciphertext, secretKey) => {
  if (typeof ciphertext === "string") {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } else if (typeof ciphertext === "object") {
    return ciphertext;
  } else if (typeof ciphertext === "string" && typeof secretKey === "string") {
    const decryptedFile = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const arrayBuffer = decryptedFile.toString(CryptoJS.enc.Latin1);
    return new Blob([arrayBuffer], { type: "application/octet-stream" });
  } else {
    throw new Error("Unsupported data type");
  }
};

