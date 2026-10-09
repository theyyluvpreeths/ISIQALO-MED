import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import jwt from 'jsonwebtoken';
import { Readable } from 'stream';
import { JWT_SECRET } from '../config/secrets';

// Azure Blob Storage. Locally this is the Azurite emulator from docker-compose;
// in production point AZURE_STORAGE_CONNECTION_STRING at a real storage account.
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'isiqalo-pacs-files';

const containerClient: ContainerClient = BlobServiceClient
  .fromConnectionString(AZURE_CONNECTION_STRING)
  .getContainerClient(CONTAINER_NAME);

let containerReady: Promise<unknown> | null = null;
function ensureContainer(): Promise<unknown> {
  if (!containerReady) {
    containerReady = containerClient.createIfNotExists().catch((err) => {
      containerReady = null; // retry on next call
      throw err;
    });
  }
  return containerReady;
}

export const Storage = {
  async uploadFile(key: string, localPath: string): Promise<void> {
    await ensureContainer();
    await containerClient.getBlockBlobClient(key).uploadFile(localPath);
  },

  async exists(key: string): Promise<boolean> {
    return containerClient.getBlockBlobClient(key).exists();
  },

  async downloadToBuffer(key: string): Promise<Buffer> {
    return containerClient.getBlockBlobClient(key).downloadToBuffer();
  },

  async openStream(key: string): Promise<{ stream: Readable; contentLength?: number }> {
    const res = await containerClient.getBlockBlobClient(key).download(0);
    if (!res.readableStreamBody) throw new Error(`Blob ${key} has no body`);
    return { stream: res.readableStreamBody as Readable, contentLength: res.contentLength };
  },

  async deleteIfExists(key: string): Promise<void> {
    await containerClient.getBlockBlobClient(key).deleteIfExists();
  },
};

// Short-lived signed links so <img src> / window.open can fetch a document
// without an Authorization header. Served by GET /api/files/:token.
const FILE_TOKEN_TTL = '10m';

export interface FileTokenPayload {
  docId: string;
  patientId: string;
  userId: string;
  purpose: 'file';
}

export function signFileToken(payload: Omit<FileTokenPayload, 'purpose'>): string {
  return jwt.sign({ ...payload, purpose: 'file' }, JWT_SECRET, { expiresIn: FILE_TOKEN_TTL });
}

export function verifyFileToken(token: string): FileTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as FileTokenPayload;
    return decoded.purpose === 'file' ? decoded : null;
  } catch {
    return null;
  }
}
