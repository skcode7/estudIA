export interface UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StoredObject {
  key: string;
  contentType: string;
}

export abstract class ObjectStorage {
  abstract upload(input: UploadInput): Promise<StoredObject>;
  abstract delete(key: string): Promise<void>;
  abstract getObject(key: string): Promise<Buffer>;
  abstract getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
