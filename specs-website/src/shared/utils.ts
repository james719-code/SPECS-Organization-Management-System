export function debounce<T extends (...args: any[]) => void>(func: T, wait = 300, immediate = false): (...args: Parameters<T>) => void {
    let timeout: any = null;
    return function executedFunction(this: any, ...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

export function throttle<T extends (...args: any[]) => void>(func: T, wait = 100): (...args: Parameters<T>) => void {
    let lastTime = 0;
    let timeout: any = null;
    
    return function executedFunction(this: any, ...args: Parameters<T>) {
        const now = Date.now();
        const remaining = wait - (now - lastTime);
        
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            lastTime = now;
            func.apply(this, args);
        } else if (!timeout) {
            timeout = setTimeout(() => {
                lastTime = Date.now();
                timeout = null;
                func.apply(this, args);
            }, remaining);
        }
    };
}

const chartInstances = new Map<string, any>();

export const chartManager = {
    register(id: string, chart: any) {
        this.destroy(id);
        chartInstances.set(id, chart);
    },
    destroy(id: string) {
        const chart = chartInstances.get(id);
        if (chart) {
            chart.destroy();
            chartInstances.delete(id);
        }
    },
    destroyAll() {
        chartInstances.forEach((chart, id) => {
            try {
                chart.destroy();
            } catch (e) {
                console.warn(`Failed to destroy chart ${id}:`, e);
            }
        });
        chartInstances.clear();
    },
    get(id: string): any {
        return chartInstances.get(id) || null;
    }
};

export function animateNumber(element: HTMLElement | null, targetValue: number, duration = 600, prefix = '', suffix = '') {
    if (!element) return;
    
    const startValue = 0;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = `${prefix}${currentValue.toLocaleString()}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
    } catch (err) {
        console.error('Copy failed:', err);
        return false;
    }
}

export async function downloadPdfFromHtml(
    htmlContent: string,
    fileName: string,
    toastCallback?: (toast: { type: 'success' | 'error' | 'info' | 'warning', title: string, message: string }) => void
) {
    if (toastCallback) {
        toastCallback({ type: 'info', title: 'Generating PDF', message: 'Preparing your download. Please wait...' });
    }

    try {
        const [{ jsPDF }, html2canvas] = await Promise.all([
            import('jspdf'),
            import('html2canvas').then(m => m.default)
        ]);

        const SCALE = 2; // html2canvas render scale for sharp output

        // ── Create hidden container for html2canvas ──
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '8.5in';
        container.style.background = 'white';
        container.innerHTML = htmlContent;

        // Remove scripts
        const scripts = container.getElementsByTagName('script');
        while (scripts.length > 0) {
            scripts[0].parentNode?.removeChild(scripts[0]);
        }

        document.body.appendChild(container);

        // Let resource assets load (header/footer images)
        await new Promise(r => setTimeout(r, 400));

        // ── Extract header / footer images directly via their <img> src ──
        const headerImgEl = container.querySelector('.print-header img') as HTMLImageElement | null;
        const footerImgEl = container.querySelector('.print-footer img') as HTMLImageElement | null;

        const getImageDimensions = (img: HTMLImageElement): Promise<{ data: string; w: number; h: number }> =>
            new Promise((resolve, reject) => {
                const cvs = document.createElement('canvas');
                cvs.width = img.naturalWidth;
                cvs.height = img.naturalHeight;
                const ctx = cvs.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                cvs.toBlob((blob) => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = () => resolve({ data: reader.result as string, w: img.naturalWidth, h: img.naturalHeight });
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    } else {
                        resolve({ data: cvs.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
                    }
                }, 'image/png');
            });

        const loadImage = (src: string): Promise<HTMLImageElement> =>
            new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

        let headerDims: { data: string; w: number; h: number } | null = null;
        let footerDims: { data: string; w: number; h: number } | null = null;

        if (headerImgEl) {
            try {
                const img = await loadImage(headerImgEl.src);
                headerDims = await getImageDimensions(img);
            } catch {
                const el = container.querySelector('.print-header') as HTMLElement | null;
                if (el) {
                    const c = await html2canvas(el, { scale: SCALE, useCORS: true, allowTaint: true, logging: false });
                    headerDims = { data: c.toDataURL('image/png'), w: c.width, h: c.height };
                }
            }
        }

        if (footerImgEl) {
            try {
                const img = await loadImage(footerImgEl.src);
                footerDims = await getImageDimensions(img);
            } catch {
                const el = container.querySelector('.print-footer') as HTMLElement | null;
                if (el) {
                    const c = await html2canvas(el, { scale: SCALE, useCORS: true, allowTaint: true, logging: false });
                    footerDims = { data: c.toDataURL('image/png'), w: c.width, h: c.height };
                }
            }
        }

        // Remove header/footer elements
        headerImgEl?.closest('.print-header')?.remove();
        footerImgEl?.closest('.print-footer')?.remove();

        // ── Remove spacer rows ──
        container.querySelectorAll('.header-spacer, .footer-spacer').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });

        // Strip @page rules
        container.querySelectorAll('style').forEach(el => {
            el.innerHTML = el.innerHTML.replace(/@page\s*\{[^}]*\}/g, '');
        });

        // ── Render body content ──
        const bodyCanvas = await html2canvas(container, {
            scale: SCALE,
            useCORS: true,
            allowTaint: true,
            logging: false
        });

        document.body.removeChild(container);

        // ── Build PDF ──
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: [612, 936] // 8.5″ × 13″
        });

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        // Header/footer height at page width preserving their natural aspect ratio
        const headerH = headerDims ? (pageW / headerDims.w) * headerDims.h : 0;
        const footerH = footerDims ? (pageW / footerDims.w) * footerDims.h : 0;

        const contentTop = headerH;
        const contentBottom = pageH - footerH;
        const contentHPerPage = contentBottom - contentTop;

        const imgW = bodyCanvas.width;
        const imgH = bodyCanvas.height;
        const contentScale = pageW / imgW;
        const totalScaledH = imgH * contentScale;

        const numPages = Math.max(1, Math.ceil(totalScaledH / contentHPerPage));

        for (let p = 0; p < numPages; p++) {
            if (p > 0) pdf.addPage();

            // Header at natural aspect ratio, full page width
            if (headerDims) {
                pdf.addImage(headerDims.data, 'PNG', 0, 0, pageW, headerH);
            }

            // Footer at natural aspect ratio, full page width
            if (footerDims) {
                pdf.addImage(footerDims.data, 'PNG', 0, pageH - footerH, pageW, footerH);
            }

            // Content slice for this page
            const srcY = p * (contentHPerPage / contentScale);
            const srcH = Math.min(contentHPerPage / contentScale, imgH - srcY);

            if (srcH > 0) {
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = imgW;
                sliceCanvas.height = Math.ceil(srcH);
                const ctx = sliceCanvas.getContext('2d')!;
                ctx.drawImage(bodyCanvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);
                const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);

                pdf.addImage(sliceData, 'JPEG', 0, contentTop, pageW, srcH * contentScale);
            }
        }

        pdf.save(fileName);

        if (toastCallback) {
            toastCallback({ type: 'success', title: 'PDF Downloaded', message: 'Your PDF report is ready.' });
        }
    } catch (err) {
        console.error('Failed to generate PDF:', err);
        if (toastCallback) {
            toastCallback({ type: 'error', title: 'Download Failed', message: 'Could not generate PDF download on this browser.' });
        }
    }
}
