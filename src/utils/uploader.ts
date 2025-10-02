import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper function to generate unique filename
const generateUniqueFilename = (originalName: string) => {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  return `${name}-${uuidv4()}${ext}`;
};

// Helper function to get file path from URL
const getFilePathFromUrl = (fileUrl: string) => {
  const filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
  return path.join(UPLOADS_DIR, filename);
};

export default {
  async uploadSingle(file: Express.Multer.File) {
    try {
      const filename = generateUniqueFilename(file.originalname);
      const filePath = path.join(UPLOADS_DIR, filename);
      
      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);
      
      // Return file information
      return {
        url: `/uploads/${filename}`,
        filename: filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  },
  
  async uploadMultiple(files: Express.Multer.File[]) {
    try {
      const uploadPromises = files.map(file => this.uploadSingle(file));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      throw new Error(`Failed to upload multiple files: ${error}`);
    }
  },
  
  async remove(fileUrl: string) {
    try {
      const filePath = getFilePathFromUrl(fileUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: "File deleted successfully" };
      } else {
        return { success: false, message: "File not found" };
      }
    } catch (error) {
      throw new Error(`Failed to remove file: ${error}`);
    }
  },
};
