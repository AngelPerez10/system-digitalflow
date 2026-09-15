import { describe, expect, it, vi } from "vitest";
import { objectUrlsForPdfViewer, pdfEmbedPreviewUrl } from "./pdfViewerPreview";

describe("pdfEmbedPreviewUrl", () => {
  it("wraps the PDF blob URL in a light-scheme embed document", () => {
    const created: Blob[] = [];
    vi.stubGlobal(
      "URL",
      class {
        static createObjectURL(blob: Blob) {
          created.push(blob);
          return "blob:http://localhost/preview";
        }
      },
    );
    const url = pdfEmbedPreviewUrl("blob:http://localhost/file.pdf");
    expect(url).toBe("blob:http://localhost/preview");
    expect(created).toHaveLength(1);
    return created[0].text().then((html) => {
      expect(html).toContain('lang="es"');
      expect(html).toContain("color-scheme: only light");
      expect(html).toContain('type="application/pdf"');
      expect(html).toContain("blob:http://localhost/file.pdf");
      expect(html).toContain('title="Vista previa del PDF"');
    });
  });
});

describe("objectUrlsForPdfViewer", () => {
  it("returns distinct preview and download URLs", () => {
    let n = 0;
    vi.stubGlobal("URL", {
      createObjectURL: () => `blob:http://localhost/${n++}`,
    });
    const pdf = new Blob(["%PDF"], { type: "application/pdf" });
    const urls = objectUrlsForPdfViewer(pdf);
    expect(urls.downloadUrl).toBe("blob:http://localhost/0");
    expect(urls.previewUrl).toBe("blob:http://localhost/1");
  });
});
