import { Injectable } from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ObjectStorage, StoredObject, UploadInput } from "./object-storage";

@Injectable()
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "estudia-materials";

    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "estudia",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "estudia-secret"
      }
    });
  }

  upload(input: UploadInput): Promise<StoredObject> {
    return this.client
      .send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType
        })
      )
      .then(() => ({ key: input.key, contentType: input.contentType }));
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    );
  }
}