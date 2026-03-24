import { z } from "zod";

export const propSchema = z.object({
  files: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string(),
        size: z.number(),
        uploadedAt: z.string(),
      })
    )
    .describe("List of uploaded files"),
});

export type FileManagerProps = z.infer<typeof propSchema>;
export type FileInfo = FileManagerProps["files"][number];
