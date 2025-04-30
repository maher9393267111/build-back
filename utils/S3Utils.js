const {
    S3Client,
    DeleteObjectCommand,
  } = require("@aws-sdk/client-s3");
  
  // S3 Configuration - Consider moving these to environment variables for security
  const bucketName = process.env.DO_SPACES_BUCKET || "dash93"; // Example using env var
  const region = process.env.DO_SPACES_REGION || "us-east-1";
  const accessKeyId = process.env.DO_SPACES_KEY || "DO00PHUUAT4VXQF27H6N";
  const secretAccessKey = process.env.DO_SPACES_SECRET || "P1YyD/tvykl7hpLKBF/g3Ff1KN2yJOunrRlWSXGRa5s";
  const endpoint = process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
  const cdnEndpoint = process.env.DO_SPACES_CDN || "https://dash93.nyc3.cdn.digitaloceanspaces.com";
  
  // Instantiate S3 Client
  const s3Client = new S3Client({
    endpoint: endpoint,
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
  
  /**
   * Deletes a single file from the S3 bucket.
   * Assumes the file is in the 'job/' directory.
   * @param {string} fileId - The unique ID of the file to delete.
   * @returns {Promise<object|null>} The result from S3 or null if error/no id.
   */
  const singleFileDelete = async (fileId) => {
    if (!fileId) {
      console.log("singleFileDelete: No fileId provided.");
      return null;
    }
  
    const deleteParams = {
      Bucket: bucketName,
      Key: `build/${fileId}`, // Assuming 'job/' prefix based on original code
    };
  
    try {
      console.log(`Attempting to delete file: job/${fileId} from bucket: ${bucketName}`);
      const result = await s3Client.send(new DeleteObjectCommand(deleteParams));
      console.log("Successfully deleted file:", fileId);
      return result;
    } catch (error) {
      console.error(`Error deleting file job/${fileId}:`, error);
      // Consider more specific error handling or re-throwing if needed
      return null;
    }
  };
  
  /**
   * Deletes multiple files from the S3 bucket.
   * Assumes files are in the 'job/' directory and image objects have an _id property.
   * @param {Array<object>} images - An array of image objects, each with an _id property.
   * @returns {Promise<Array<object>>} An array of S3 results for successful deletions.
   */
  const multiFilesDelete = async (images) => {
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.log("multiFilesDelete: No images provided or invalid format.");
      return [];
    }
  
    const results = [];
    const deletePromises = [];
  
    for (const image of images) {
      if (!image || !image._id) {
        console.warn("multiFilesDelete: Skipping image without _id:", image);
        continue;
      }
  
      const fileId = image._id;
      const deleteParams = {
        Bucket: bucketName,
        Key: `build/${fileId}`, // Assuming 'job/' prefix
      };
  
      console.log(`Queueing deletion for file: build/${fileId}`);
      deletePromises.push(
        s3Client.send(new DeleteObjectCommand(deleteParams))
          .then(result => {
            console.log("Successfully deleted file:", fileId);
            results.push(result); // Collect successful results
          })
          .catch(error => {
            console.error(`Error deleting file build/${fileId}:`, error);
            // Decide if you want to collect errors or just log them
          })
      );
    }
  
    await Promise.all(deletePromises); // Wait for all deletions to attempt
    console.log(`multiFilesDelete finished. ${results.length} files potentially deleted.`);
    return results; // Return only successful results
  };
  
  module.exports = {
    s3Client,
    singleFileDelete,
    multiFilesDelete,
    bucketName, // Export if needed elsewhere
    cdnEndpoint, // Export if needed elsewhere
  };