/**
 * Converts the report HTML used by the PDF/print exports into an editable
 * Word (.docx) file. It walks the DOM and maps the subset of HTML/CSS that the
 * report templates use (headings, paragraphs, lists, tables, images, simple
 * grid/flex layouts) onto native Word structures. The `.print-header` and
 * `.print-footer` images become the real Word page header and footer.
 */
import type { IParagraphOptions, ParagraphChild } from 'docx';

type Docx = typeof import('docx');
type Toast = (toast: { type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string }) => void;

type Align = 'left' | 'center' | 'right' | 'justify';

interface InheritedStyle {
    font: string;
    sizePx: number;
    color?: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: Align;
    lineHeight?: number;
    upper: boolean;
    pre: boolean;
}

type Block =
    | { t: 'p'; opts: IParagraphOptions }
    | { t: 'table'; table: any };

interface Ctx {
    d: Docx;
    widthTwips: number;
    pendingBreak: { value: boolean };
}

// 8.5in x 13in (Folio), matching the PDF export.
const PAGE_W = 12240;
const PAGE_H = 18720;
const SIDE_MARGIN = 1440; // 2.54cm, same as the print layout table padding
const CONTENT_W = PAGE_W - SIDE_MARGIN * 2;
const PX_TO_TWIP = 15;

const BLOCK_TAGS = new Set([
    'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'UL', 'OL', 'LI', 'HR', 'SECTION',
    'ARTICLE', 'HEADER', 'FOOTER', 'PRE', 'BLOCKQUOTE', 'FORM', 'TBODY', 'THEAD', 'TFOOT', 'TR',
]);

const HEADING_SIZE: Record<string, number> = { H1: 2, H2: 1.5, H3: 1.17, H4: 1, H5: 0.83, H6: 0.67 };
const HEADING_MARGIN: Record<string, number> = { H1: 0.67, H2: 0.83, H3: 1, H4: 1.33, H5: 1.67, H6: 2.33 };

const NAMED_COLORS: Record<string, string> = {
    black: '000000', white: 'FFFFFF', red: 'FF0000', gray: '808080', grey: '808080', green: '008000', blue: '0000FF',
};

// ── CSS helpers ──────────────────────────────────────────────────────────────

function parseLength(value: string | undefined, basePx: number): number | null {
    if (!value) return null;
    const m = value.trim().match(/^(-?\d*\.?\d+)(px|pt|em|rem|cm|mm|in|%)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    switch (m[2]) {
        case 'pt': return n * (96 / 72);
        case 'em':
        case 'rem': return n * basePx;
        case 'cm': return (n * 96) / 2.54;
        case 'mm': return (n * 96) / 25.4;
        case 'in': return n * 96;
        case '%': return null;
        default: return n;
    }
}

function parseColor(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const v = value.trim().toLowerCase();
    if (NAMED_COLORS[v]) return NAMED_COLORS[v];
    let m = v.match(/^#([0-9a-f]{3})$/);
    if (m) return m[1].split('').map(c => c + c).join('').toUpperCase();
    m = v.match(/^#([0-9a-f]{6})/);
    if (m) return m[1].toUpperCase();
    m = v.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) return [m[1], m[2], m[3]].map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('').toUpperCase();
    return undefined;
}

interface BorderSpec { size: number; color: string; none: boolean }

/** Parses `1px solid #000` style shorthand. */
function parseBorder(value: string | undefined): BorderSpec | null {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    if (!v) return null;
    if (v === 'none' || v === '0' || v.startsWith('0 ') || v.includes('none')) return { size: 0, color: '000000', none: true };
    const width = v.match(/(\d*\.?\d+)(px|pt)/);
    const px = width ? (width[2] === 'pt' ? parseFloat(width[1]) * (96 / 72) : parseFloat(width[1])) : 1;
    const colorMatch = v.match(/(#[0-9a-f]{3,6}|rgba?\([^)]*\)|\b(black|white|red|gray|grey|green|blue)\b)/);
    const color = parseColor(colorMatch?.[0]) || '000000';
    // docx border size is in eighths of a point
    return { size: Math.max(2, Math.round(px * 0.75 * 8)), color, none: false };
}

function getBorder(el: HTMLElement, side: 'top' | 'right' | 'bottom' | 'left'): BorderSpec | null {
    return parseBorder(el.style.getPropertyValue(`border-${side}`)) || parseBorder(el.style.getPropertyValue('border'));
}

function box(el: HTMLElement, prop: 'margin' | 'padding', side: string, basePx: number): number {
    const explicit = parseLength(el.style.getPropertyValue(`${prop}-${side}`), basePx);
    if (explicit !== null) return explicit;
    const shorthand = el.style.getPropertyValue(prop).trim().split(/\s+/).filter(Boolean);
    if (!shorthand.length) return 0;
    const idx = { top: 0, right: 1, bottom: 2, left: 3 }[side as 'top'];
    const pick =
        shorthand.length === 1 ? shorthand[0]
        : shorthand.length === 2 ? shorthand[idx % 2]
        : shorthand.length === 3 ? shorthand[idx === 3 ? 1 : idx]
        : shorthand[idx];
    return parseLength(pick, basePx) ?? 0;
}

const twip = (px: number) => Math.max(0, Math.round(px * PX_TO_TWIP));

function fontFamily(raw: string | undefined, fallback: string): string {
    if (!raw) return fallback;
    const first = raw.split(',')[0].replace(/["']/g, '').trim();
    if (!first || /^(serif|sans-serif|monospace)$/i.test(first)) return fallback;
    return first;
}

function deriveStyle(el: HTMLElement, parent: InheritedStyle): InheritedStyle {
    const s = el.style;
    const tag = el.tagName;
    const next: InheritedStyle = { ...parent };

    next.font = fontFamily(s.fontFamily, parent.font);

    const size = s.fontSize ? parseLength(s.fontSize, parent.sizePx) : null;
    if (size) next.sizePx = size;
    else if (HEADING_SIZE[tag]) next.sizePx = parent.sizePx * HEADING_SIZE[tag];
    else if (tag === 'SMALL') next.sizePx = parent.sizePx * 0.83;

    const color = parseColor(s.color);
    if (color) next.color = color;

    if (s.fontWeight) next.bold = s.fontWeight === 'bold' || parseInt(s.fontWeight, 10) >= 600;
    else if (/^(B|STRONG|TH|H[1-6])$/.test(tag)) next.bold = true;

    if (s.fontStyle) next.italic = s.fontStyle === 'italic';
    else if (tag === 'I' || tag === 'EM') next.italic = true;

    const deco = s.textDecoration || s.getPropertyValue('text-decoration-line');
    if (deco) next.underline = deco.includes('underline');
    else if (tag === 'U') next.underline = true;

    if (s.textAlign && /^(left|center|right|justify)$/.test(s.textAlign)) next.align = s.textAlign as Align;
    else if (tag === 'CENTER') next.align = 'center';

    if (s.lineHeight) {
        const lh = s.lineHeight.trim();
        if (/^\d*\.?\d+$/.test(lh)) next.lineHeight = parseFloat(lh);
        else {
            const px = parseLength(lh, next.sizePx);
            if (px) next.lineHeight = px / next.sizePx;
        }
    }

    if (s.textTransform) next.upper = s.textTransform === 'uppercase';
    if (s.whiteSpace) next.pre = /^pre/.test(s.whiteSpace);
    if (tag === 'PRE') next.pre = true;

    return next;
}

// ── Images ───────────────────────────────────────────────────────────────────

interface LoadedImage { data: ArrayBuffer; type: 'png' | 'jpg' | 'gif'; w: number; h: number }

const imageCache = new Map<string, Promise<LoadedImage | null>>();

async function blobToImage(blob: Blob): Promise<LoadedImage> {
    const url = URL.createObjectURL(blob);
    try {
        const img: HTMLImageElement = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = url;
        });
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const mime = blob.type;
        // Word natively embeds png/jpeg/gif; anything else (webp, svg, ...) is re-encoded as PNG.
        if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/gif') {
            return { data: await blob.arrayBuffer(), type: mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'gif', w, h };
        }
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        cvs.getContext('2d')!.drawImage(img, 0, 0);
        const png: Blob = await new Promise((resolve, reject) =>
            cvs.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png'));
        return { data: await png.arrayBuffer(), type: 'png', w, h };
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function loadViaCanvas(src: string): Promise<LoadedImage> {
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = src;
    });
    const cvs = document.createElement('canvas');
    cvs.width = img.naturalWidth || 1;
    cvs.height = img.naturalHeight || 1;
    cvs.getContext('2d')!.drawImage(img, 0, 0);
    const png: Blob = await new Promise((resolve, reject) =>
        cvs.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png'));
    return { data: await png.arrayBuffer(), type: 'png', w: cvs.width, h: cvs.height };
}

function loadImage(src: string): Promise<LoadedImage | null> {
    let cached = imageCache.get(src);
    if (!cached) {
        cached = (async () => {
            try {
                const res = await fetch(src);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await blobToImage(await res.blob());
            } catch {
                try {
                    return await loadViaCanvas(src);
                } catch {
                    return null;
                }
            }
        })();
        imageCache.set(src, cached);
    }
    return cached;
}

// ── Inline content ───────────────────────────────────────────────────────────

function textOf(raw: string, st: InheritedStyle): string {
    let text = raw;
    if (!st.pre) text = text.replace(/[ \t\r\n\f]+/g, ' ');
    return st.upper ? text.toUpperCase() : text;
}

function runOptions(st: InheritedStyle, extra: Record<string, unknown> = {}) {
    return {
        font: st.font,
        size: Math.max(2, Math.round(st.sizePx * 0.75 * 2)), // px → half-points
        color: st.color,
        bold: st.bold || undefined,
        italics: st.italic || undefined,
        underline: st.underline ? {} : undefined,
        ...extra,
    };
}

async function inlineChildren(nodes: Node[], st: InheritedStyle, ctx: Ctx, maxImgW: number): Promise<ParagraphChild[]> {
    const { TextRun, ImageRun } = ctx.d;
    const out: ParagraphChild[] = [];

    for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = textOf(node.textContent || '', st);
            if (!text) continue;
            if (st.pre) {
                text.split(/\r?\n/).forEach((line, i) => {
                    out.push(new TextRun({ ...runOptions(st), text: line, break: i > 0 ? 1 : undefined }));
                });
            } else {
                out.push(new TextRun({ ...runOptions(st), text }));
            }
            continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const el = node as HTMLElement;
        const tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || el.style.display === 'none') continue;

        if (tag === 'BR') {
            out.push(new TextRun({ ...runOptions(st), text: '', break: 1 }));
        } else if (tag === 'IMG') {
            const src = el.getAttribute('src');
            const loaded = src ? await loadImage(src) : null;
            if (!loaded) {
                out.push(new TextRun({ ...runOptions(st), text: '[image unavailable]', italics: true }));
                continue;
            }
            const styleW = parseLength(el.style.width, st.sizePx);
            const styleH = parseLength(el.style.height, st.sizePx);
            const attrW = parseInt(el.getAttribute('width') || '', 10) || null;
            const boxW = styleW || attrW || Math.min(loaded.w, maxImgW);
            const boundW = Math.min(boxW, maxImgW);
            const boundH = styleH || Infinity;
            // Fit inside the requested box while keeping aspect ratio.
            const scale = Math.min(boundW / loaded.w, boundH / loaded.h, boxW === loaded.w ? 1 : Infinity);
            const finalScale = Number.isFinite(scale) ? scale : 1;
            out.push(new ImageRun({
                type: loaded.type,
                data: loaded.data,
                transformation: {
                    width: Math.max(1, Math.round(loaded.w * finalScale)),
                    height: Math.max(1, Math.round(loaded.h * finalScale)),
                },
            }));
        } else {
            out.push(...await inlineChildren(Array.from(el.childNodes), deriveStyle(el, st), ctx, maxImgW));
        }
    }
    return out;
}

function isBlockElement(el: HTMLElement): boolean {
    const display = el.style.display;
    if (display) return display !== 'inline' && display !== 'inline-block';
    return BLOCK_TAGS.has(el.tagName);
}

function hasContent(children: ParagraphChild[]): boolean {
    return children.length > 0;
}

// ── Block content ────────────────────────────────────────────────────────────

function paragraphOptions(el: HTMLElement | null, st: InheritedStyle, children: ParagraphChild[], ctx: Ctx): IParagraphOptions {
    const d = ctx.d;
    const alignment = { left: d.AlignmentType.LEFT, center: d.AlignmentType.CENTER, right: d.AlignmentType.RIGHT, justify: d.AlignmentType.JUSTIFIED }[st.align];
    const opts: IParagraphOptions = {
        children,
        alignment,
        spacing: {
            before: 0,
            after: 0,
            ...(st.lineHeight ? { line: Math.round(st.lineHeight * 240), lineRule: d.LineRuleType.AUTO } : {}),
        },
    };

    if (el) {
        const border: Record<string, any> = {};
        (['top', 'right', 'bottom', 'left'] as const).forEach(side => {
            const b = getBorder(el, side);
            if (b && !b.none) border[side] = { style: d.BorderStyle.SINGLE, size: b.size, color: b.color, space: 1 };
        });
        if (Object.keys(border).length) opts.border = border;

        const bg = parseColor(el.style.backgroundColor || el.style.background);
        if (bg) opts.shading = { type: d.ShadingType.CLEAR, fill: bg, color: 'auto' };
    }

    if (ctx.pendingBreak.value) {
        opts.pageBreakBefore = true;
        ctx.pendingBreak.value = false;
    }
    return opts;
}

function elementSpacing(el: HTMLElement, st: InheritedStyle, tag: string): { before: number; after: number } {
    let mt = box(el, 'margin', 'top', st.sizePx);
    let mb = box(el, 'margin', 'bottom', st.sizePx);
    if (!el.style.marginTop && !el.style.margin) {
        if (tag === 'P') mt = st.sizePx;
        if (HEADING_MARGIN[tag]) mt = HEADING_MARGIN[tag] * st.sizePx;
    }
    if (!el.style.marginBottom && !el.style.margin) {
        if (tag === 'P') mb = st.sizePx;
        if (HEADING_MARGIN[tag]) mb = HEADING_MARGIN[tag] * st.sizePx;
    }
    return {
        before: twip(mt + box(el, 'padding', 'top', st.sizePx)),
        after: twip(mb + box(el, 'padding', 'bottom', st.sizePx)),
    };
}

function addSpacing(blocks: Block[], before: number, after: number) {
    const first = blocks.find(b => b.t === 'p');
    const last = [...blocks].reverse().find(b => b.t === 'p');
    if (first && first.t === 'p' && before) {
        first.opts.spacing = { ...first.opts.spacing, before: (first.opts.spacing?.before || 0) + before };
    }
    if (last && last.t === 'p' && after) {
        last.opts.spacing = { ...last.opts.spacing, after: (last.opts.spacing?.after || 0) + after };
    }
}

function applyIndent(blocks: Block[], left: number, right: number) {
    if (!left && !right) return;
    for (const b of blocks) {
        if (b.t !== 'p') continue;
        const cur = b.opts.indent || {};
        b.opts.indent = { ...cur, left: (cur.left || 0) + left, right: (cur.right || 0) + right };
    }
}

async function convertChildren(parent: HTMLElement, st: InheritedStyle, ctx: Ctx): Promise<Block[]> {
    const blocks: Block[] = [];
    let inline: Node[] = [];

    const flush = async () => {
        if (!inline.length) return;
        const children = await inlineChildren(inline, st, ctx, ctx.widthTwips / PX_TO_TWIP);
        const meaningful = inline.some(n => (n.nodeType === Node.TEXT_NODE ? (n.textContent || '').trim() : true));
        inline = [];
        if (hasContent(children) && meaningful) {
            blocks.push({ t: 'p', opts: paragraphOptions(null, st, children, ctx) });
        }
    };

    for (const node of Array.from(parent.childNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE && isBlockElement(node as HTMLElement)) {
            await flush();
            blocks.push(...await convertBlock(node as HTMLElement, st, ctx));
        } else {
            inline.push(node);
        }
    }
    await flush();
    return blocks;
}

function hasBlockChild(el: HTMLElement): boolean {
    return Array.from(el.children).some(c => isBlockElement(c as HTMLElement));
}

async function convertBlock(el: HTMLElement, parentStyle: InheritedStyle, ctx: Ctx): Promise<Block[]> {
    const blocks = await convertBlockCore(el, parentStyle, ctx);
    const breakAfter = /always|page/.test(el.style.getPropertyValue('page-break-after') || el.style.getPropertyValue('break-after'));
    if (breakAfter) ctx.pendingBreak.value = true;
    return blocks;
}

/** A pending page break can't live inside a table cell, so tables get an explicit break paragraph in front. */
function takeBreak(ctx: Ctx): Block[] {
    if (!ctx.pendingBreak.value) return [];
    ctx.pendingBreak.value = false;
    return [{ t: 'p', opts: { children: [], pageBreakBefore: true, spacing: { before: 0, after: 0, line: 20 } } }];
}

async function convertBlockCore(el: HTMLElement, parentStyle: InheritedStyle, ctx: Ctx): Promise<Block[]> {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || el.style.display === 'none') return [];

    const breakBefore = /always|page/.test(el.style.getPropertyValue('page-break-before') || el.style.getPropertyValue('break-before'));
    if (breakBefore) ctx.pendingBreak.value = true;

    const st = deriveStyle(el, parentStyle);
    const spacing = elementSpacing(el, parentStyle, tag);

    if (tag === 'TABLE') {
        const brk = takeBreak(ctx);
        return [...brk, { t: 'table', table: await convertTable(el, st, ctx) }, spacerAfter(el, ctx, parentStyle)];
    }

    if (tag === 'HR') {
        const d = ctx.d;
        return [{
            t: 'p',
            opts: {
                children: [],
                spacing: { before: spacing.before, after: spacing.after },
                border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: '808080', space: 1 } },
            },
        }];
    }

    if (tag === 'UL' || tag === 'OL') {
        const out: Block[] = [];
        let n = 1;
        const ordered = tag === 'OL';
        for (const li of Array.from(el.children) as HTMLElement[]) {
            if (li.tagName !== 'LI') continue;
            const liStyle = deriveStyle(li, st);
            const marker = ordered ? `${n++}.` : (li.style.listStyleType === 'circle' ? '◦' : '•');
            const children = await inlineChildren(Array.from(li.childNodes), liStyle, ctx, ctx.widthTwips / PX_TO_TWIP);
            const opts = paragraphOptions(li, liStyle, [new ctx.d.TextRun({ ...runOptions(liStyle), text: `${marker}\t` }), ...children], ctx);
            opts.indent = { left: 720, hanging: 360 };
            opts.tabStops = [{ type: ctx.d.TabStopType.LEFT, position: 720 }];
            const ls = elementSpacing(li, st, 'LI');
            opts.spacing = { ...opts.spacing, before: ls.before, after: ls.after };
            out.push({ t: 'p', opts });
        }
        addSpacing(out, spacing.before, spacing.after);
        return out;
    }

    const display = el.style.display;

    // Grid / flex rows with block children → a borderless table, one column per child.
    if ((display === 'grid' || display === 'flex') && el.style.flexDirection !== 'column') {
        const kids = Array.from(el.children) as HTMLElement[];
        if (kids.length && kids.some(k => isBlockElement(k) || k.tagName === 'IMG' || k.querySelector('img'))) {
            const brk = takeBreak(ctx);
            return [...brk, { t: 'table', table: await convertGrid(el, kids, st, ctx) }, spacerAfter(el, ctx, parentStyle)];
        }
        // Flex row of inline items (e.g. a legend): one paragraph, items separated by spacing.
        if (kids.length) {
            const children: ParagraphChild[] = [];
            for (let i = 0; i < kids.length; i++) {
                if (i > 0) children.push(new ctx.d.TextRun({ ...runOptions(st), text: '      ' }));
                children.push(...await inlineChildren([kids[i]], st, ctx, ctx.widthTwips / PX_TO_TWIP));
            }
            const opts = paragraphOptions(el, st, children, ctx);
            opts.spacing = { ...opts.spacing, before: spacing.before, after: spacing.after };
            return [{ t: 'p', opts }];
        }
    }

    // Container with block children → recurse
    if (hasBlockChild(el)) {
        const inner = await convertChildren(el, st, ctx);
        addSpacing(inner, spacing.before, spacing.after);
        applyIndent(inner, twip(box(el, 'padding', 'left', st.sizePx)) + (tag === 'BLOCKQUOTE' ? 720 : 0), twip(box(el, 'padding', 'right', st.sizePx)));
        return inner;
    }

    // Leaf block → single paragraph
    const children = await inlineChildren(Array.from(el.childNodes), st, ctx, ctx.widthTwips / PX_TO_TWIP);
    const hasBorder = (['top', 'bottom', 'left', 'right'] as const).some(s => {
        const b = getBorder(el, s);
        return b && !b.none;
    });
    if (!hasContent(children) && !hasBorder && !el.style.height) return [];

    const opts = paragraphOptions(el, st, children, ctx);
    opts.spacing = { ...opts.spacing, before: spacing.before, after: spacing.after };
    const width = parseLength(el.style.width, st.sizePx);
    if (width && el.style.width.endsWith('px') && width * PX_TO_TWIP < ctx.widthTwips && st.align === 'center') {
        const side = Math.round((ctx.widthTwips - width * PX_TO_TWIP) / 2);
        opts.indent = { left: side, right: side };
    }
    return [{ t: 'p', opts }];
}

/** Word needs a paragraph between consecutive tables, and the HTML margin below one is lost otherwise. */
function spacerAfter(el: HTMLElement, ctx: Ctx, parentStyle: InheritedStyle): Block {
    const mb = box(el, 'margin', 'bottom', parentStyle.sizePx);
    return { t: 'p', opts: { children: [], spacing: { before: 0, after: twip(mb), line: 20 } } };
}

// ── Tables ───────────────────────────────────────────────────────────────────

function percentWidth(el: HTMLElement): number | null {
    const w = el.style.width || el.getAttribute('width') || '';
    const m = w.match(/^(\d*\.?\d+)%$/);
    return m ? parseFloat(m[1]) : null;
}

function cellBorders(d: Docx, el: HTMLElement, tableBorder: BorderSpec | null) {
    const none = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const out: Record<string, any> = { top: none, bottom: none, left: none, right: none };
    (['top', 'right', 'bottom', 'left'] as const).forEach(side => {
        const b = getBorder(el, side);
        if (b && !b.none) out[side] = { style: d.BorderStyle.SINGLE, size: b.size, color: b.color };
    });
    return out;
}

async function buildCell(
    el: HTMLElement,
    st: InheritedStyle,
    widthTwips: number,
    ctx: Ctx,
    opts: { columnSpan?: number; verticalMerge?: any; shade?: string },
) {
    const d = ctx.d;
    const cellStyle = deriveStyle(el, st);
    const padL = twip(box(el, 'padding', 'left', cellStyle.sizePx));
    const padR = twip(box(el, 'padding', 'right', cellStyle.sizePx));
    const padT = twip(box(el, 'padding', 'top', cellStyle.sizePx));
    const padB = twip(box(el, 'padding', 'bottom', cellStyle.sizePx));

    const innerCtx: Ctx = { ...ctx, widthTwips: Math.max(720, widthTwips - padL - padR) };
    const blocks = await convertChildren(el, cellStyle, innerCtx);
    const children: any[] = blocks.map(b => (b.t === 'p' ? new d.Paragraph(b.opts) : b.table));
    if (!children.length || children[children.length - 1] instanceof d.Table) children.push(new d.Paragraph({ children: [] }));

    const bg = parseColor(el.style.backgroundColor || el.style.background) || opts.shade;
    const va = el.style.verticalAlign || el.getAttribute('valign') || '';

    return new d.TableCell({
        children,
        width: { size: widthTwips, type: d.WidthType.DXA },
        columnSpan: opts.columnSpan && opts.columnSpan > 1 ? opts.columnSpan : undefined,
        verticalMerge: opts.verticalMerge,
        borders: cellBorders(d, el, null),
        shading: bg ? { type: d.ShadingType.CLEAR, fill: bg, color: 'auto' } : undefined,
        verticalAlign: va === 'middle' ? d.VerticalAlign.CENTER : va === 'bottom' ? d.VerticalAlign.BOTTOM : d.VerticalAlign.TOP,
        margins: { top: padT, bottom: padB, left: padL, right: padR },
    });
}

async function convertTable(table: HTMLElement, st: InheritedStyle, ctx: Ctx) {
    const d = ctx.d;
    const rows = Array.from(table.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr')) as HTMLElement[];

    // Column count (accounting for colspan) and column widths from the first rows that declare them.
    let colCount = 0;
    rows.forEach(r => {
        const n = (Array.from(r.children) as HTMLTableCellElement[]).reduce((sum, c) => sum + (c.colSpan || 1), 0);
        colCount = Math.max(colCount, n);
    });
    colCount = Math.max(colCount, 1);

    const totalPct = percentWidth(table) ?? 100;
    const tableTwips = Math.round(ctx.widthTwips * Math.min(totalPct, 100) / 100);
    const declared: (number | null)[] = Array(colCount).fill(null);
    for (const r of rows) {
        let col = 0;
        for (const c of Array.from(r.children) as HTMLTableCellElement[]) {
            const span = c.colSpan || 1;
            const pct = percentWidth(c);
            if (pct !== null && span === 1 && declared[col] === null) declared[col] = pct;
            col += span;
        }
    }
    const declaredSum = declared.reduce<number>((s, v) => s + (v || 0), 0);
    const undeclared = declared.filter(v => v === null).length;
    const share = undeclared ? Math.max(0, 100 - declaredSum) / undeclared : 0;
    const pcts = declared.map(v => (v === null ? share : v));
    const pctTotal = pcts.reduce((a, b) => a + b, 0) || 1;
    const colWidths = pcts.map(p => Math.max(360, Math.round((p / pctTotal) * tableTwips)));

    // Row/col occupancy for rowspan handling
    const pendingMerge: number[] = Array(colCount).fill(0);
    const tableRows: any[] = [];

    for (const tr of rows) {
        const rowShade = parseColor(tr.style.backgroundColor || tr.style.background);
        const cells: any[] = [];
        const cellEls = Array.from(tr.children).filter(c => c.tagName === 'TD' || c.tagName === 'TH') as HTMLTableCellElement[];
        let col = 0;
        let ci = 0;

        while (col < colCount) {
            if (pendingMerge[col] > 0) {
                // Continuation of a cell that started in a previous row
                cells.push(new d.TableCell({
                    children: [new d.Paragraph({ children: [] })],
                    width: { size: colWidths[col], type: d.WidthType.DXA },
                    verticalMerge: d.VerticalMergeType.CONTINUE,
                    borders: { top: { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
                }));
                pendingMerge[col]--;
                col++;
                continue;
            }
            const cellEl = cellEls[ci++];
            if (!cellEl) break;
            const span = Math.min(cellEl.colSpan || 1, colCount - col);
            const rowSpan = cellEl.rowSpan || 1;
            const width = colWidths.slice(col, col + span).reduce((a, b) => a + b, 0);
            cells.push(await buildCell(cellEl, st, width, ctx, {
                columnSpan: span,
                verticalMerge: rowSpan > 1 ? d.VerticalMergeType.RESTART : undefined,
                shade: rowShade,
            }));
            if (rowSpan > 1) for (let k = 0; k < span; k++) pendingMerge[col + k] = rowSpan - 1;
            col += span;
        }

        const keepTogether = /avoid/.test(tr.style.getPropertyValue('page-break-inside') || tr.style.getPropertyValue('break-inside'));
        tableRows.push(new d.TableRow({ children: cells, cantSplit: keepTogether || undefined, tableHeader: tr.parentElement?.tagName === 'THEAD' || undefined }));
    }

    const none = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    return new d.Table({
        rows: tableRows,
        width: { size: tableTwips, type: d.WidthType.DXA },
        columnWidths: colWidths,
        layout: d.TableLayoutType.FIXED,
        borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    });
}

/** Grid / flex row → borderless table. Items wrap into rows of `columns` cells. */
async function convertGrid(container: HTMLElement, kids: HTMLElement[], st: InheritedStyle, ctx: Ctx) {
    const d = ctx.d;
    const template = container.style.gridTemplateColumns;
    const columns = container.style.display === 'grid' && template
        ? Math.max(1, template.trim().split(/\s+/).length)
        : container.style.flexWrap === 'wrap' ? Math.min(2, kids.length) : kids.length;
    const gap = twip(parseLength((container.style.gap || '').trim().split(/\s+/).pop(), st.sizePx) ?? 0);
    const bg = parseColor(container.style.backgroundColor || container.style.background);
    const colW = Math.floor(ctx.widthTwips / columns);

    const rows: any[] = [];
    for (let i = 0; i < kids.length; i += columns) {
        const cells: any[] = [];
        for (let c = 0; c < columns; c++) {
            const kid = kids[i + c];
            const cellCtx: Ctx = { ...ctx, widthTwips: colW - gap };
            const blocks = kid ? await convertBlock(kid, st, cellCtx) : [];
            const children: any[] = blocks.map(b => (b.t === 'p' ? new d.Paragraph(b.opts) : b.table));
            if (!children.length || children[children.length - 1] instanceof d.Table) children.push(new d.Paragraph({ children: [] }));
            const none = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
            cells.push(new d.TableCell({
                children,
                width: { size: colW, type: d.WidthType.DXA },
                borders: { top: none, bottom: none, left: none, right: none },
                margins: { top: 0, bottom: gap, left: gap / 2, right: gap / 2 },
                shading: bg ? { type: d.ShadingType.CLEAR, fill: bg, color: 'auto' } : undefined,
                verticalAlign: d.VerticalAlign.CENTER,
            }));
        }
        rows.push(new d.TableRow({ children: cells, cantSplit: true }));
    }

    const none = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    return new d.Table({
        rows,
        width: { size: colW * columns, type: d.WidthType.DXA },
        columnWidths: Array(columns).fill(colW),
        layout: d.TableLayoutType.FIXED,
        borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    });
}

// ── Stylesheet inlining ──────────────────────────────────────────────────────

function stripAtRules(css: string): string {
    let out = '';
    let i = 0;
    while (i < css.length) {
        if (css[i] !== '@') {
            out += css[i++];
            continue;
        }
        let j = i;
        while (j < css.length && css[j] !== '{' && css[j] !== ';') j++;
        if (css[j] === ';') {
            i = j + 1;
            continue;
        }
        let depth = 0;
        for (; j < css.length; j++) {
            if (css[j] === '{') depth++;
            else if (css[j] === '}' && --depth === 0) {
                j++;
                break;
            }
        }
        i = j;
    }
    return out;
}

function selectorSpecificity(sel: string): number {
    const ids = (sel.match(/#[\w-]+/g) || []).length;
    const classes = (sel.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(\([^)]*\))?/g) || []).length;
    const tags = (sel.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+(\([^)]*\))?/g, ' ').match(/[a-zA-Z][\w-]*/g) || []).length;
    return ids * 10000 + classes * 100 + tags;
}

/**
 * The report templates style most tables through `<style>` classes (e.g. `.report-table td`).
 * Resolve those rules onto each element's inline style so the converter, which only reads
 * inline styles, sees them. Inline declarations keep priority; @media/@page rules are ignored.
 */
function inlineStylesheets(doc: Document) {
    const css = stripAtRules(
        Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n').replace(/\/\*[\s\S]*?\*\//g, ''),
    );

    interface Rule { sel: string; spec: number; order: number; decls: [string, string, boolean][] }
    const rules: Rule[] = [];
    let order = 0;
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const decls: [string, string, boolean][] = [];
        for (const part of m[2].split(';')) {
            const idx = part.indexOf(':');
            if (idx < 0) continue;
            const prop = part.slice(0, idx).trim().toLowerCase();
            let value = part.slice(idx + 1).trim();
            const important = /!\s*important\s*$/i.test(value);
            value = value.replace(/!\s*important\s*$/i, '').trim();
            if (prop && value) decls.push([prop, value, important]);
        }
        for (const sel of m[1].split(',')) {
            const trimmed = sel.trim();
            if (trimmed) rules.push({ sel: trimmed, spec: selectorSpecificity(trimmed), order: order++, decls });
        }
    }
    rules.sort((a, b) => a.spec - b.spec || a.order - b.order);

    const inlineNames = new WeakMap<Element, string[]>();
    const important = new WeakMap<Element, Set<string>>();

    for (const rule of rules) {
        let targets: NodeListOf<Element>;
        try {
            targets = doc.querySelectorAll(rule.sel);
        } catch {
            continue; // selector the engine can't parse
        }
        targets.forEach(el => {
            const style = (el as HTMLElement).style;
            if (!style) return;
            let own = inlineNames.get(el);
            if (!own) {
                own = Array.from((el.getAttribute('style') || '').matchAll(/([a-z-]+)\s*:/gi)).map(x => x[1].toLowerCase());
                inlineNames.set(el, own);
            }
            const imp = important.get(el) || new Set<string>();
            important.set(el, imp);
            for (const [prop, value, isImportant] of rule.decls) {
                const family = prop.split('-')[0];
                const overriddenInline = own.some(n => n === prop || n.startsWith(`${prop}-`) || (prop.includes('-') && n === family));
                if (overriddenInline) continue;
                if (imp.has(prop) && !isImportant) continue;
                style.setProperty(prop, value, isImportant ? 'important' : '');
                if (isImportant) imp.add(prop);
            }
        });
    }
}

// ── Layout-table flattening ──────────────────────────────────────────────────

/**
 * The report HTML wraps content in `.print-layout-table` with spacer rows that
 * reserve room for the fixed header/footer. Word has real headers/footers, so
 * replace that table by the contents of its non-spacer cells.
 */
function flattenLayoutTables(doc: Document) {
    doc.querySelectorAll('table.print-layout-table').forEach(table => {
        const fragment = doc.createDocumentFragment();
        table.querySelectorAll(':scope > tbody > tr').forEach(tr => {
            const row = tr as HTMLElement;
            const breakBefore = /always|page/.test(row.style.getPropertyValue('page-break-before') || row.style.getPropertyValue('break-before'));
            Array.from(row.children).forEach(td => {
                const wrapper = doc.createElement('div');
                if (breakBefore) wrapper.style.setProperty('page-break-before', 'always');
                while (td.firstChild) wrapper.appendChild(td.firstChild);
                fragment.appendChild(wrapper);
            });
        });
        table.replaceWith(fragment);
    });
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function buildDocxBlobFromHtml(htmlContent: string): Promise<Blob> {
    const d = await import('docx');
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

    const headerImg = doc.querySelector('.print-header img') as HTMLImageElement | null;
    const footerImg = doc.querySelector('.print-footer img') as HTMLImageElement | null;
    const headerSrc = headerImg?.getAttribute('src') || null;
    const footerSrc = footerImg?.getAttribute('src') || null;
    doc.querySelectorAll('.print-header, .print-footer, script').forEach(el => el.remove());

    inlineStylesheets(doc);
    flattenLayoutTables(doc);
    doc.querySelectorAll('.header-spacer, .footer-spacer').forEach(el => el.remove());

    const rootStyle: InheritedStyle = {
        font: 'Times New Roman',
        sizePx: 16,
        color: undefined,
        bold: false,
        italic: false,
        underline: false,
        align: 'left',
        lineHeight: undefined,
        upper: false,
        pre: false,
    };
    const base = deriveStyle(doc.body, rootStyle);

    const ctx: Ctx = { d, widthTwips: CONTENT_W, pendingBreak: { value: false } };
    const blocks = await convertChildren(doc.body, base, ctx);
    const children: any[] = blocks.map(b => (b.t === 'p' ? new d.Paragraph(b.opts) : b.table));
    if (!children.length) children.push(new d.Paragraph({ children: [] }));

    // Header / footer images span the full page width, as in the PDF export.
    const fullWidthImage = async (src: string | null) => {
        if (!src) return null;
        const loaded = await loadImage(src);
        if (!loaded) return null;
        const widthPx = (PAGE_W / PX_TO_TWIP);
        const heightPx = (widthPx / loaded.w) * loaded.h;
        return { loaded, widthPx: Math.round(widthPx), heightPx: Math.round(heightPx) };
    };
    const [hdr, ftr] = await Promise.all([fullWidthImage(headerSrc), fullWidthImage(footerSrc)]);

    const imageParagraph = (img: NonNullable<typeof hdr>) => new d.Paragraph({
        spacing: { before: 0, after: 0, line: 240 },
        indent: { left: -SIDE_MARGIN, right: -SIDE_MARGIN },
        children: [new d.ImageRun({
            type: img.loaded.type,
            data: img.loaded.data,
            transformation: { width: img.widthPx, height: img.heightPx },
        })],
    });

    const topMargin = hdr ? Math.round(hdr.heightPx * PX_TO_TWIP) + 120 : 1440;
    const bottomMargin = ftr ? Math.round(ftr.heightPx * PX_TO_TWIP) + 120 : 1440;

    const wordDoc = new d.Document({
        creator: 'SPECS',
        title: doc.title || 'SPECS Report',
        styles: { default: { document: { run: { font: base.font, size: 24 } } } },
        sections: [{
            properties: {
                page: {
                    size: { width: PAGE_W, height: PAGE_H },
                    margin: { top: topMargin, bottom: bottomMargin, left: SIDE_MARGIN, right: SIDE_MARGIN, header: 0, footer: 0 },
                },
            },
            headers: hdr ? { default: new d.Header({ children: [imageParagraph(hdr)] }) } : undefined,
            footers: ftr ? { default: new d.Footer({ children: [imageParagraph(ftr)] }) } : undefined,
            children,
        }],
    });

    return d.Packer.toBlob(wordDoc);
}

export async function downloadDocxFromHtml(htmlContent: string, fileName: string, toastCallback?: Toast) {
    toastCallback?.({ type: 'info', title: 'Generating Word file', message: 'Preparing your download. Please wait...' });
    try {
        const blob = await buildDocxBlobFromHtml(htmlContent);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toastCallback?.({ type: 'success', title: 'Word File Downloaded', message: 'Your .docx report is ready.' });
    } catch (err) {
        console.error('Failed to generate DOCX:', err);
        toastCallback?.({ type: 'error', title: 'Download Failed', message: 'Could not generate the Word download on this browser.' });
    }
}
