const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");

const account = process.env.ACCOUNT_NAME;
const sasToken = process.env.SAS_TOKEN
const containerName = process.env.CONTAINER

const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net/?${sasToken}`);
const containerClient = new blobServiceClient.getContainerClass(containerName)

module.exports = { blobServiceClient, containerClient }