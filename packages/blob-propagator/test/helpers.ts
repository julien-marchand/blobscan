import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import type { SuiteFactory } from "vitest";

import { getBlobStorageManager } from "@blobscan/blob-storage-manager";
import type {
  BlobReference,
  BlobStorageManager,
} from "@blobscan/blob-storage-manager";
import { prisma } from "@blobscan/db";
import type {
  Blob,
  BlobStorage,
  BlobStorage as BlobStorageName,
} from "@blobscan/db";

import { blobFileManager } from "../src/blob-file-manager";
import type { BlobPropagationSandboxedJob } from "../src/types";
import gcsWorker from "../src/worker-processors/gcs";
import postgresWorker from "../src/worker-processors/postgres";
import swarmWorker from "../src/worker-processors/swarm";

type TestSuiteFixtures = {
  blobVersionedHash: string;
  blobStorageReference: string;
  blobData: string;
};

type TestSuiteOptions = {
  fixtures: TestSuiteFixtures;
  runBeforeAllFns?: () => void;
  runAfterAllFns?: () => void;
};

function getStorageWorker(storage: BlobStorage) {
  switch (storage) {
    case "GOOGLE":
      return gcsWorker;
    case "POSTGRES":
      return postgresWorker;
    case "SWARM":
      return swarmWorker;
  }
}

export function runStorageWorkerTestSuite(
  storage: BlobStorageName,
  {
    fixtures: { blobVersionedHash, blobStorageReference, blobData },
    runBeforeAllFns,
    runAfterAllFns,
  }: TestSuiteOptions
): SuiteFactory {
  return () => {
    let blobStorageManager: BlobStorageManager;
    const expectedBlobStorageRef: BlobReference = {
      storage,
      reference: blobStorageReference,
    };
    const storageWorker = getStorageWorker(storage);
    const job = {
      data: {
        versionedHash: blobVersionedHash,
      },
    } as BlobPropagationSandboxedJob;
    const blob: Blob = {
      versionedHash: blobVersionedHash,
      commitment: "test-commitment",
      insertedAt: new Date(),
      size: 1,
      updatedAt: new Date(),
      firstBlockNumber: null,
    };

    beforeAll(async () => {
      if (runBeforeAllFns) {
        runBeforeAllFns();
      }

      blobStorageManager = await getBlobStorageManager();
    });

    afterAll(() => {
      if (runAfterAllFns) {
        runAfterAllFns();
      }
    });

    beforeEach(async () => {
      await blobFileManager.createBlobDataFile({
        versionedHash: blobVersionedHash,
        data: blobData,
      });

      await prisma.blob.create({
        data: blob,
      });
    });

    afterEach(async () => {
      await blobFileManager.removeBlobDataFile(blobVersionedHash);

      await prisma.blobDataStorageReference.deleteMany({
        where: {
          blobHash: blobVersionedHash,
        },
      });
      await prisma.blob.delete({
        where: {
          versionedHash: blobVersionedHash,
        },
      });
    });

    it(`should store blob data in the ${storage} storage correctly`, async () => {
      await storageWorker(job);

      const expectedResult = { storage, data: blobData };
      const result = await blobStorageManager.getBlob(expectedBlobStorageRef);

      expect(result).toEqual(expectedResult);
    });

    it(`should store the blob ${storage} storage reference correctly`, async () => {
      await storageWorker(job);

      const blobStorageReference =
        await prisma.blobDataStorageReference.findUnique({
          where: {
            blobHash_blobStorage: {
              blobHash: blobVersionedHash,
              blobStorage: expectedBlobStorageRef.storage,
            },
          },
        });

      expect(blobStorageReference?.blobHash).toBe(blobVersionedHash);
      expect(blobStorageReference?.dataReference).toBe(
        expectedBlobStorageRef.reference
      );
      expect(blobStorageReference?.blobStorage).toBe(
        expectedBlobStorageRef.storage
      );
    });

    it(`should return the correct blob ${storage} storage reference`, async () => {
      const blobStorageReference = await storageWorker(job);

      expect(blobStorageReference).toEqual(expectedBlobStorageRef);
    });

    it("should throw an error if the blob data file is missing", async () => {
      const versionedHash = "missingBlobDataFileVersionedHash";
      const jobWithMissingBlobData = {
        data: {
          versionedHash,
        },
      } as BlobPropagationSandboxedJob;

      await expect(
        storageWorker(jobWithMissingBlobData)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"Couldn\'t read blob missingBlobDataFileVersionedHash data file: file is missing"'
      );
      ``;
    });
  };
}
