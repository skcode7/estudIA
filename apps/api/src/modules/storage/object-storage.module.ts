import { Global, Module } from "@nestjs/common";

import { S3ObjectStorage } from "../../infrastructure/object-storage/s3.object-storage";
import { ObjectStorage } from "./application/ports/object-storage";

@Global()
@Module({
  providers: [{ provide: ObjectStorage, useClass: S3ObjectStorage }],
  exports: [ObjectStorage]
})
export class ObjectStorageModule {}
