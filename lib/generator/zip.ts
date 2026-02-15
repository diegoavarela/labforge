import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { SkillFile } from "./skill";

export async function generateAndDownloadZip(
  projectName: string,
  files: SkillFile[]
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  saveAs(blob, `${safeName || "skills"}.zip`);
}
