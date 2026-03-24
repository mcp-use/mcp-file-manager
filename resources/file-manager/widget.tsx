import {
  ErrorBoundary,
  Image,
  McpUseProvider,
  useFiles,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import { useCallback, useRef, useState } from "react";
import "../styles.css";
import { propSchema, type FileInfo } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "File vault with upload, preview, and download",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    invoking: "Loading vault...",
    invoked: "Vault ready",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : "FILE";
}

const MIME_COLORS: Record<string, { bg: string; text: string }> = {
  image: {
    bg: "bg-violet-100 dark:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
  },
  video: {
    bg: "bg-pink-100 dark:bg-pink-500/15",
    text: "text-pink-700 dark:text-pink-300",
  },
  audio: {
    bg: "bg-amber-100 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
  },
  application: {
    bg: "bg-blue-100 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300",
  },
  text: {
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};

function mimeCategory(mimeType: string): string {
  return mimeType.split("/")[0];
}

function MimeIcon({ mimeType }: { mimeType: string }) {
  const cat = mimeCategory(mimeType);
  if (cat === "image") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path
          fillRule="evenodd"
          d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 9.5c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.07l-2.72-2.72a.75.75 0 00-1.06 0l-3.22 3.22-1.72-1.72a.75.75 0 00-1.06 0l-5.22 5.22v-1.93zm12-5.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0116 6.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 012 16.5v-13A1.5 1.5 0 013.5 2h1v1.5z" />
    </svg>
  );
}

function TypeBadge({ mimeType }: { mimeType: string }) {
  const cat = mimeCategory(mimeType);
  const colors = MIME_COLORS[cat] ?? MIME_COLORS.application;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text}`}
    >
      {cat}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Upload Dropzone
// ---------------------------------------------------------------------------

function UploadDropzone({
  onUpload,
  isUploading,
}: {
  onUpload: (file: File) => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onUpload(files[0]);
    },
    [onUpload]
  );

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
        isDragging
          ? "border-blue-400 bg-blue-50/50 dark:bg-blue-500/5 dark:border-blue-500"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center gap-2 py-8 px-4 cursor-pointer"
      >
        {isUploading ? (
          <>
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Uploading...
            </span>
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-8 h-8 text-gray-400 dark:text-gray-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop files here
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {" "}
                or click to browse
              </span>
            </div>
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Card
// ---------------------------------------------------------------------------

function FileCard({
  file,
  downloadUrl,
  onDownload,
  mcp_url,
}: {
  file: FileInfo;
  downloadUrl: string | null;
  onDownload: (id: string) => void;
  mcp_url: string;
}) {
  const isImage = file.mimeType.startsWith("image/");
  const colors =
    MIME_COLORS[mimeCategory(file.mimeType)] ?? MIME_COLORS.application;

  return (
    <div className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-gray-600">
      {/* Preview area */}
      <div className="relative h-32 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden">
        {isImage ? (
          <Image
            src={`${mcp_url}/api/files/${file.id}`}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`flex flex-col items-center gap-1.5 ${colors.text}`}>
            <MimeIcon mimeType={file.mimeType} />
            <span className="text-xs font-bold opacity-60">
              {fileExtension(file.name)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate leading-tight flex-1">
            {file.name}
          </h3>
          <TypeBadge mimeType={file.mimeType} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatBytes(file.size)}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(file.uploadedAt).toLocaleDateString()}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onDownload(file.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
        >
          <div className="h-32 bg-gray-100 dark:bg-gray-900/50 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
            <div className="h-7 w-full rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error fallback
// ---------------------------------------------------------------------------

function ErrorFallback() {
  return (
    <McpUseProvider autoSize>
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/15 mb-3">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-6 h-6 text-red-600 dark:text-red-400"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Something went wrong
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The file manager encountered an error. Please try again.
        </p>
      </div>
    </McpUseProvider>
  );
}

// ---------------------------------------------------------------------------
// Main Widget
// ---------------------------------------------------------------------------

function FileManagerContent() {
  const { props, isPending, mcp_url, isAvailable } = useWidget<{
    files: FileInfo[];
  }>();
  const { upload, getDownloadUrl, isSupported } = useFiles();

  const [isUploading, setIsUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState<FileInfo[]>([]);

  const allFiles = [...(props?.files ?? []), ...localFiles];

  const handleSdkUpload = useCallback(
    async (file: File) => {
      if (!isSupported) return;
      setIsUploading(true);
      try {
        await upload(file);
      } finally {
        setIsUploading(false);
      }
    },
    [isSupported, upload]
  );

  const handleFallbackUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch(`${mcp_url}/api/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            data: base64,
          }),
        });

        const { id } = (await res.json()) as { id: string };
        setLocalFiles((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            uploadedAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsUploading(false);
      }
    },
    [mcp_url]
  );

  const handleUpload = useCallback(
    (file: File) => {
      if (isSupported) {
        handleSdkUpload(file);
      } else {
        handleFallbackUpload(file);
      }
    },
    [isSupported, handleSdkUpload, handleFallbackUpload]
  );

  const handleDownload = useCallback(
    async (id: string) => {
      if (isSupported) {
        try {
          const { downloadUrl } = await getDownloadUrl({ fileId: id });
          window.open(downloadUrl, "_blank");
        } catch {
          window.open(`${mcp_url}/api/files/${id}`, "_blank");
        }
      } else {
        window.open(`${mcp_url}/api/files/${id}`, "_blank");
      }
    },
    [isSupported, getDownloadUrl, mcp_url]
  );

  if (!isAvailable) {
    return (
      <McpUseProvider autoSize>
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Connecting...
            </span>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading vault...
            </span>
          </div>
          <SkeletonGrid />
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4.5 h-4.5 text-white"
              >
                <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                File Vault
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {allFiles.length} file{allFiles.length !== 1 ? "s" : ""}
                {isSupported ? " · ChatGPT upload" : " · HTTP upload"}
              </p>
            </div>
          </div>
        </div>

        {/* Upload */}
        <UploadDropzone onUpload={handleUpload} isUploading={isUploading} />

        {/* File grid */}
        {allFiles.length === 0 ? (
          <div className="py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="w-7 h-7 text-gray-400 dark:text-gray-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No files yet. Upload something to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                downloadUrl={null}
                onDownload={handleDownload}
                mcp_url={mcp_url}
              />
            ))}
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}

export default function FileManager() {
  return (
    <ErrorBoundary>
      <FileManagerContent />
    </ErrorBoundary>
  );
}
