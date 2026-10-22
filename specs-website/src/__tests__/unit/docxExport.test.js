import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import JSZip from 'jszip';
import { buildDocxBlobFromHtml } from '../../shared/docxExport';

// 1x1 transparent PNG
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));

const REPORT_HTML = `
<html><head><style>.print-header{position:fixed}</style></head><body>
  <div class="print-header"><img src="http://localhost/header.png" /></div>
  <div class="print-footer"><img src="http://localhost/footer.png" /></div>
  <table class="print-layout-table">
    <thead><tr><td><div class="header-spacer"></div></td></tr></thead>
    <tbody>
      <tr><td>
        <h2 class="report-title" style="text-align:center;font-weight:800;text-transform:uppercase;">Annual Assembly</h2>
        <div style="white-space: pre-wrap; text-align: justify;">Line one
Line two</div>
        <div style="display:flex;flex-wrap:wrap;gap:15px"><span><strong>5</strong> &ndash; Excellent</span><span><strong>4</strong> &ndash; Very Good</span></div>
        <table style="width:100%;border-collapse:collapse;border:1px solid black">
          <thead><tr style="background-color:#f8fafc"><th style="border:1px solid black;width:25%">AREA</th><th style="border:1px solid black;width:75%">CRITERIA</th></tr></thead>
          <tbody>
            <tr><td rowspan="2" style="border:1px solid black">Area A</td><td style="border:1px solid black">First</td></tr>
            <tr><td style="border:1px solid black">Second</td></tr>
            <tr><td colspan="2" style="border:1px solid black;text-align:right">OVERALL 4.50</td></tr>
          </tbody>
        </table>
        <ul style="list-style-type:disc"><li>Objective one</li><li>Objective two</li></ul>
        <div style="text-align:center;width:250px"><div style="border-top:1px solid #000"></div><p style="font-weight:bold">JUAN DELA CRUZ</p></div>
      </td></tr>
      <tr style="page-break-before: always;"><td>
        <h2>Photo Documentation</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px">
          <div><img src="http://localhost/p1.png" style="width:100%;height:260px" /><div style="background-color:#7ee8a2">Caption A</div></div>
          <div><img src="http://localhost/p2.png" style="width:100%;height:260px" /></div>
        </div>
      </td></tr>
    </tbody>
    <tfoot><tr><td><div class="footer-spacer"></div></td></tr></tfoot>
  </table>
</body></html>`;

// jsdom's Blob has no arrayBuffer()
const readBlob = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsArrayBuffer(blob);
});

describe('docxExport', () => {
  const realFetch = globalThis.fetch;
  const RealImage = globalThis.Image;
  const createUrl = URL.createObjectURL;
  const revokeUrl = URL.revokeObjectURL;

  beforeAll(() => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => ({ type: 'image/png', arrayBuffer: async () => PNG.buffer.slice(0) }),
    }));
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    globalThis.Image = class {
      set src(_v) {
        this.naturalWidth = 400;
        this.naturalHeight = 200;
        queueMicrotask(() => this.onload && this.onload());
      }
    };
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
    globalThis.Image = RealImage;
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = revokeUrl;
  });

  it('produces a valid docx with header/footer, tables, lists, grid and page breaks', async () => {
    const blob = await buildDocxBlobFromHtml(REPORT_HTML);
    const zip = await JSZip.loadAsync(await readBlob(blob));

    const files = Object.keys(zip.files);
    expect(files).toContain('word/document.xml');
    expect(files.some(f => /word\/header\d*\.xml/.test(f))).toBe(true);
    expect(files.some(f => /word\/footer\d*\.xml/.test(f))).toBe(true);
    expect(files.some(f => f.startsWith('word/media/'))).toBe(true);

    const xml = await zip.file('word/document.xml').async('string');
    expect(() => new DOMParser().parseFromString(xml, 'application/xml')).not.toThrow();
    expect(xml).not.toContain('print-layout-table');
    // both photos are embedded in the body (media itself is de-duplicated by content)
    expect((xml.match(/<w:drawing>/g) || []).length).toBe(2);

    // text + inline formatting
    expect(xml).toContain('ANNUAL ASSEMBLY');
    expect(xml).toContain('Line one');
    expect(xml).toContain('Line two');
    expect(xml).toContain('Excellent');
    expect(xml).toContain('JUAN DELA CRUZ');
    expect(xml).toContain('Caption A');

    // tables: rowspan → vMerge, colspan → gridSpan, shading kept
    expect(xml).toMatch(/<w:vMerge w:val="restart"/);
    expect(xml).toMatch(/<w:vMerge\/>|<w:vMerge w:val="continue"/);
    expect(xml).toContain('<w:gridSpan w:val="2"');

    // lists, page break before photo page, 13in page
    expect(xml).toContain('Objective one');
    expect(xml).toContain('<w:pageBreakBefore');
    expect(xml).toContain('w:h="18720"');
  });

  it('applies <style> class rules (ledger-style reports) and page-break-after', async () => {
    const html = `<html><head><style>
      .report-table { width: 100%; border-collapse: collapse; }
      .report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 10px 12px; }
      .report-table th { background-color: #f1f5f9; font-weight: 700; text-transform: uppercase; }
      .report-table tr:nth-child(even) { background-color: #f8fafc; }
      .page-break { page-break-after: always; }
      @media print { .report-table td { border: none; } }
    </style></head><body>
      <h2 class="report-title">Ledger</h2>
      <table class="report-table"><thead><tr><th>Name</th><th>Paid</th></tr></thead>
        <tbody><tr><td>Ann</td><td>100</td></tr><tr><td>Bob</td><td>200</td></tr></tbody></table>
      <div class="page-break"></div>
      <h2>Second activity</h2>
      <p>After the break</p>
    </body></html>`;
    const zip = await JSZip.loadAsync(await readBlob(await buildDocxBlobFromHtml(html)));
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('NAME'); // text-transform from class
    expect(xml).toMatch(/<w:top w:val="single"[^>]*w:color="E2E8F0"/); // class border, @media ignored
    expect(xml).toContain('w:fill="F1F5F9"'); // th background
    expect(xml).toContain('w:fill="F8FAFC"'); // nth-child(even) row
    const afterBreak = xml.indexOf('Second activity');
    expect(xml.lastIndexOf('<w:pageBreakBefore', afterBreak)).toBeGreaterThan(xml.indexOf('Bob'));
  });

  it('still produces a document for empty input', async () => {
    const blob = await buildDocxBlobFromHtml('<html><body></body></html>');
    const zip = await JSZip.loadAsync(await readBlob(blob));
    expect(zip.file('word/document.xml')).toBeTruthy();
  });
});
