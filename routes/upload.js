const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { PrismaClient } = require('@prisma/client');
const {
  S3Client,
  ListBucketsCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { JSDOM } = require('jsdom');

const prisma = new PrismaClient();
const validFileTypes = ["*/*"];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  // Remove the fileFilter since we want to accept all file types
});

const fileRouter = express.Router();

// prepare S3 client
const bucketName = "dash93";
const region = "us-east-1";
const accessKeyId = "DO00PHUUAT4VXQF27H6N";
// "DO00M9XA6DJ9P9Y4UWFT";
const secretAccessKey = "P1YyD/tvykl7hpLKBF/g3Ff1KN2yJOunrRlWSXGRa5s";
// "fcWJxA4nn0r5yNKUi1011UzQ66FPMO6Lt8UEuGWSypE";

const endpoint = "https://nyc3.digitaloceanspaces.com";
const cdnEndpoint = "https://dash93.nyc3.cdn.digitaloceanspaces.com";

const s3Client = new S3Client({
  endpoint: endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Flag to determine if uploaded file should be added to media library
fileRouter.post("/uploadfile", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded" });
    }

    const file = req.file;
    const addToMediaLibrary = req.body.addToMediaLibrary === 'true';
    const setAsInUse = req.body.setAsInUse === 'true'; // New parameter to control inUse flag
    
    console.log("FILE-->🔞 🌐🌐🔞 🌐🌐", file);
    console.log("Add to Media Library:", addToMediaLibrary);
    console.log("Set as in use:", setAsInUse);
    
    const fileName = `${crypto.randomBytes(32).toString("hex")}${path.extname(
      file.originalname
    )}`;

    let fileBuffer = file.buffer;
    let fileType = 'document'; // default type

    // Determine file type based on mimetype
    if (file.mimetype.startsWith('image/')) {
      fileType = 'image';
      // Process images with sharp (excluding SVGs)
      if (!file.mimetype.includes('svg')) {
        fileBuffer = file.buffer; // Use original buffer without resizing
      }
    } else if (file.mimetype.startsWith('video/')) {
      fileType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      fileType = 'audio';
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `build/${fileName}`,
        Body: fileBuffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      })
    );

    const response = {
      _id: fileName,
      url: `${cdnEndpoint}/build/${fileName}`,
      type: fileType,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      createdAt: new Date().toISOString(),
      isDefaultImage: false,
      fromMediaLibrary: false
    };

    
    // If addToMediaLibrary flag is true, add to the Media table
    if (addToMediaLibrary) {
      try {
        // First check if this file already exists in the media library
        const existingMedia = await prisma.media.findUnique({
          where: { fileId: fileName }
        });
        
        let mediaEntry;
        
        if (existingMedia) {
          // If it exists, update it
          mediaEntry = await prisma.media.update({
            where: { fileId: fileName },
            data: {
              name: file.originalname || 'Untitled',
              url: response.url,
              type: fileType,
              mimeType: file.mimetype,
              size: file.size,
              originalName: file.originalname,
              isDefaultImage: false,
              inUse: setAsInUse
            }
          });
        } else {
          // If it doesn't exist, create it
          mediaEntry = await prisma.media.create({
            data: {
              name: file.originalname || 'Untitled',
              fileId: fileName,
              url: response.url,
              type: fileType,
              mimeType: file.mimetype,
              size: file.size,
              originalName: file.originalname,
              isDefaultImage: false,
              inUse: setAsInUse
            }
          });
        }
        
        response.mediaId = mediaEntry.id;
        response.fromMediaLibrary = true;
        
        console.log("Added to media library:", mediaEntry.id);
      } catch (dbError) {
        console.error('Error adding to media library:', dbError);
        // Continue even if adding to media library fails
      }
    }

    console.log("File uploaded successfully:", response);
    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
});

fileRouter.delete("/deletefile", async (req, res) => {
  try {
    const { fileName, skipMediaCheck } = req.query;

    console.log("DELETE BODY-->", req.query);

    if (!fileName) {
      return res.status(400).json({ message: "No file name provided" });
    }

    // Check if this file is in the media library and is being used elsewhere
    if (skipMediaCheck !== 'true') {
      const mediaItem = await prisma.media.findUnique({
        where: { fileId: fileName }
      });
      
      if (mediaItem) {
        if (mediaItem.inUse) {
          // Just update the media record to mark this particular usage as removed
          console.log("File is in media library and in use. Not deleting from S3.");
          return res.json({ 
            message: "File is in media library. Not deleted from storage.",
            fromMediaLibrary: true,
            mediaId: mediaItem.id
          });
        } else {
          // If in media library but not in use elsewhere, delete both records
          await prisma.media.delete({
            where: { id: mediaItem.id }
          });
        }
      }
    }
    
    // Delete from S3
    const deleteParams = {
      Bucket: bucketName,
      Key: `build/${fileName}` ,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));

    console.log("File deleted successfully:", fileName);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



//normal delete file no logic of media 
fileRouter.delete("/deletefile-normal", async (req, res) => {
  try {
    const { fileName } = req.query;

    console.log("DELETE BODY-->", req.query);

    if (!fileName) {
      return res.status(400).json({ message: "No file name provided" });
    }

    
    const deleteParams = {
      Bucket: bucketName,
      Key: `build/${fileName}` ,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));

    console.log("File deleted successfully:", fileName);
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



// New endpoint to select from media library
fileRouter.get("/media-library", async (req, res) => {
  try {
    const { page = 1, limit = 20, type, search } = req.query;
    const skip = (page - 1) * parseInt(limit);
    
    // Build filter object
    let where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { originalName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get media items with count
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.media.count({ where })
    ]);
    
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.status(200).json({
      media,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching media library:', error);
    res.status(500).json({ error: 'Failed to fetch media library' });
  }
});

// ------------------------SLIDER------------

fileRouter.post("/uploads", upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files were uploaded" });
    }

    console.log("FILES", req.files);
    const uploadedFiles = [];

    // Process and upload the new files
    for (const file of req.files) {
      const fileName = `${crypto.randomBytes(32).toString("hex")}${path.extname(
        file.originalname
      )}`;
      const size = parseInt(req.query.size);
      const hieghtsize = parseInt(req.query.hieghtsize);

      const fileBuffer = await sharp(file.buffer)
        .resize({
          height: hieghtsize ? hieghtsize : 800,
          width: size ? size : 1000,
          fit: "fill",
        })
        .toBuffer();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: fileBuffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        })
      );

      uploadedFiles.push(fileName);
    }

    console.log("Files uploaded and deleted successfully.", uploadedFiles);
    res.status(200).json({ files: uploadedFiles });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
});

//DELETE ARRAY OF IMAGES

fileRouter.post("/delets", async (req, res) => {
  const { filesToDelete } = req.body;

  console.log("FILES TO DELETE", filesToDelete, "BODYYYY-->", req.body);

  try {
    if (!filesToDelete || filesToDelete.length === 0) {
      return res.status(400).json({ message: "No files to delete" });
    }

    for (const file of filesToDelete) {
      const deleteParams = {
        Bucket: "dash93",
        Key: file,
      };
      await s3Client.send(new DeleteObjectCommand(deleteParams));
    }

    res.json({ message: "Files deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error." });
  }
});

// -----------------
// SVG

async function modifyImageColors(buffer, color, isSvg) {
  try {
    if (isSvg) {
      const svgString = buffer.toString('utf8');
      const dom = new JSDOM(svgString);
      const svg = dom.window.document.querySelector('svg');
      
      function processElement(element) {
        // Process stroke attribute for borders
        if (element.hasAttribute('stroke') && 
            element.getAttribute('stroke') !== 'none' && 
            element.getAttribute('stroke') !== 'transparent') {
          element.setAttribute('stroke', color);
        }
        
        // Process style attribute but only modify stroke-related properties
        if (element.hasAttribute('style')) {
          let style = element.getAttribute('style');
          
          // Only replace stroke color in style, leave fill unchanged
          if (style.includes('stroke:') && 
              !style.includes('stroke:none') && 
              !style.includes('stroke:transparent')) {
            style = style.replace(/stroke:[^;]+/g, `stroke:${color}`);
          }
          
          element.setAttribute('style', style);
        }
        
        // Fixed conditional check for stroke
        if (!element.hasAttribute('stroke') && 
            !(element.hasAttribute('style') && element.getAttribute('style').includes('stroke:'))) {
          element.setAttribute('stroke', color);
        }
        
        // Process all child elements recursively
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
          processElement(children[i]);
        }
      }
      
      // Process all SVG elements
      Array.from(svg.children).forEach(child => {
        processElement(child);
      });
      
      const modifiedSvg = dom.window.document.querySelector('svg').outerHTML;
      return Buffer.from(modifiedSvg);
    } else {
      // Non-SVG image handling remains unchanged
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      return await sharp(buffer)
        .tint({ r, g, b })
        .toBuffer();
    }
  } catch (error) {
    console.error("Error modifying image colors:", error);
    throw error;
  }
}

fileRouter.post("/uploadsvg", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded" });
    }

    const file = req.file;
    const color = req.body.color;
    console.log("COLOR-->❇❇❇❇❇", color);
    const isSvg = file.mimetype.includes('svg');
    
    let processedBuffer;
    if (isSvg) {
      // Process SVG
      processedBuffer = await modifyImageColors(file.buffer, color, true);
    } else {
      // Process other image types
      const size = parseInt(req.query.size);
      const heightSize = parseInt(req.query.heightsize);

      let resizedBuffer = file.buffer;
      if (size || heightSize) {
        resizedBuffer = await sharp(file.buffer)
          .resize({
            height: heightSize || 450,
            width: size || 900,
            fit: "fill",
          })
          .toBuffer();
      }

      processedBuffer = await modifyImageColors(resizedBuffer, color, false);
    }

    const fileName = `${crypto.randomBytes(32).toString("hex")}${path.extname(file.originalname)}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `build/${fileName}`,
        Body: processedBuffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      })
    );

    res.status(200).json({ 
      _id: fileName,
      url: `${cdnEndpoint}/job/${fileName}`,
      color: color
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});


// Add this helper function to convert streams to buffers
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Add new endpoint for chunked file uploads
fileRouter.post("/upload-chunk", upload.single("file"), async (req, res) => {
  try {
    // Get chunk information from headers
    const fileId = req.headers['x-file-id'];
    const chunkIndex = parseInt(req.headers['x-chunk-index']);
    const totalChunks = parseInt(req.headers['x-total-chunks']);
    const fileSize = parseInt(req.headers['x-file-size']);
    const fileType = req.headers['x-file-type'];

    // Add timeout validation
    const UPLOAD_TIMEOUT = 300000; // 5 minutes
    req.setTimeout(UPLOAD_TIMEOUT);

    if (fileSize > 100 * 1024 * 1024) {
      return res.status(413).json({ error: "File size too large. Maximum size is 100MB" });
    }

    // Validate chunk data
    if (!req.file || !fileId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return res.status(400).json({ 
        error: "Invalid chunk data",
        details: "Missing required chunk information"
      });
    }

    // Store chunk with retry logic
    const MAX_RETRIES = 3;
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const chunkKey = `temp/${fileId}/${chunkIndex}`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: chunkKey,
            Body: req.file.buffer,
            ContentType: fileType
          })
        );
        break; // Success, exit retry loop
      } catch (err) {
        retries++;
        if (retries === MAX_RETRIES) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      }
    }

    // If this isn't the last chunk, return progress
    if (chunkIndex < totalChunks - 1) {
      return res.json({
        status: 'chunk-received',
        chunkIndex,
        totalChunks
      });
    }

    // For the last chunk, combine all chunks
    const chunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: `temp/${fileId}/${i}`
        })
      );
      
      const chunk = await streamToBuffer(chunkData.Body);
      chunks.push(chunk);
    }

    // Combine chunks and upload final file
    const completeFile = Buffer.concat(chunks);
    const fileName = `${crypto.randomBytes(32).toString("hex")}${path.extname(req.file.originalname)}`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `build/${fileName}`,
        Body: completeFile,
        ContentType: fileType,
        ACL: "public-read"
      })
    );

    // Clean up temp chunks
    for (let i = 0; i < totalChunks; i++) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: `temp/${fileId}/${i}`
        })
      );
    }

    const response = {
      _id: fileName,
      url: `${cdnEndpoint}/job/${fileName}`,
      type: fileType,
      originalName: req.file.originalname,
      size: fileSize,
      createdAt: new Date().toISOString(),
      isDefaultImage: false
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error.code === 'TimeoutError' 
      ? 'Upload timeout - please try again'
      : error.message;
      
    res.status(500).json({ 
      error: "Upload failed", 
      message: errorMessage,
      code: error.code
    });
  }
});

module.exports = { fileRouter };

