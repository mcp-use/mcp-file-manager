import { MCPServer, text, widget, object, error } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "file-manager",
  title: "File Manager",
  version: "1.0.0",
  description:
    "File vault — showcasing useFiles, Image, ErrorBoundary, and custom HTTP endpoints",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

// ---------------------------------------------------------------------------
// In-memory file store
// ---------------------------------------------------------------------------

interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string;
  uploadedAt: string;
}

const fileStore = new Map<string, StoredFile>();

// ---------------------------------------------------------------------------
// Custom HTTP endpoints (Hono layer)
// ---------------------------------------------------------------------------

server.post("/api/files", async (c) => {
  const body = await c.req.json<{ name: string; mimeType: string; data: string }>();
  const id = crypto.randomUUID();
  const buf = Buffer.from(body.data, "base64");

  fileStore.set(id, {
    id,
    name: body.name,
    mimeType: body.mimeType,
    size: buf.length,
    data: body.data,
    uploadedAt: new Date().toISOString(),
  });

  return c.json({ id });
});

server.get("/api/files/:id", async (c) => {
  const file = fileStore.get(c.req.param("id"));
  if (!file) {
    return c.json({ error: "Not found" }, 404);
  }

  const buf = Buffer.from(file.data, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Content-Length": String(buf.length),
    },
  });
});

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "open-vault",
    description: "Open the file manager vault to upload, preview, and download files",
    schema: z.object({}),
    widget: {
      name: "file-manager",
      invoking: "Loading vault...",
      invoked: "Vault ready",
    },
  },
  async () => {
    const files = Array.from(fileStore.values()).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      uploadedAt: f.uploadedAt,
    }));

    return widget({ props: { files } });
  }
);

server.tool(
  {
    name: "get-file",
    description: "Get metadata for a specific file by ID",
    schema: z.object({
      id: z.string().describe("The file ID"),
    }),
  },
  async ({ id }) => {
    const file = fileStore.get(id);
    if (!file) {
      return error("File not found");
    }
    return object({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: file.uploadedAt,
    });
  }
);

server.tool(
  {
    name: "list-files",
    description: "List all uploaded files with their metadata",
    schema: z.object({}),
  },
  async () => {
    const files = Array.from(fileStore.values()).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      uploadedAt: f.uploadedAt,
    }));
    return object({ files });
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

server.listen().then(() => {
  console.log("File Manager running");
});
