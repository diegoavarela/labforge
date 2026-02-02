import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { PluginFile } from "./plugin";

export async function generateAndDownloadZip(
  pluginName: string,
  files: PluginFile[]
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const safeName = pluginName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  saveAs(blob, `${safeName || "plugin"}.zip`);
}
