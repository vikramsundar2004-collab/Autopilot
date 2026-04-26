import { contextBridge, ipcRenderer } from "electron";

type PrintOptions = {
  deviceName?: string;
  copies?: number;
  color?: boolean;
  landscape?: boolean;
};

function getPreviewId(): string {
  const argument = process.argv.find((value) => value.startsWith("--autopilot-print-preview-id="));
  return argument?.slice("--autopilot-print-preview-id=".length) ?? "";
}

const previewId = getPreviewId();

contextBridge.exposeInMainWorld("autopilotPrintPreview", {
  print: (options: PrintOptions) =>
    ipcRenderer.invoke("print-preview:print", { ...options, previewId }) as Promise<{ success: boolean; reason?: string }>
});
