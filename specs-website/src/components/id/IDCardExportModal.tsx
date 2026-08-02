import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IDCardPreview, IDCardData } from './IDCardPreview';
import { X, Download, Image as ImageIcon, Upload, Layers, Printer } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface IDCardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: IDCardData | null;
}

export const IDCardExportModal: React.FC<IDCardExportModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [side, setSide] = useState<'front' | 'back' | 'both'>('both');
  const [format, setFormat] = useState<'pdf' | 'png'>('pdf');
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  if (!isOpen || !data) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast({ type: 'error', title: 'Invalid File', message: 'Please upload an image file.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64Url = evt.target?.result as string;
        setCustomPhotoUrl(base64Url);
        addToast({ type: 'success', title: 'Photo Attached', message: 'Photo attached to photo slot.' });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setCustomPhotoUrl(null);
    addToast({ type: 'info', title: 'Photo Cleared', message: 'Reverted to blank photo box.' });
  };

  // Helper to capture card element cleanly using html-to-image directly on live element
  const captureCardImage = async (targetEl: HTMLElement) => {
    const { toPng } = await import('html-to-image');
    const width = 508;
    const height = 320;

    // Pre-inline all img elements inside targetEl as base64 data URLs to eliminate cross-origin/blob fetch errors
    const imgElements = Array.from(targetEl.querySelectorAll('img'));
    for (const img of imgElements) {
      if (img.src && !img.src.startsWith('data:')) {
        try {
          const response = await fetch(img.src, { mode: 'cors' });
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
        } catch {
          // If fetch is restricted, keep original src
        }
      }
    }

    return await toPng(targetEl, {
      quality: 1.0,
      pixelRatio: 4,
      width: width,
      height: height,
      skipFonts: true,
      cacheBust: false,
      style: {
        transform: 'none',
        margin: '0',
        boxShadow: 'none'
      }
    });
  };

  // Main Download Trigger
  const handleDownload = async () => {
    setDownloading(true);

    try {
      const safeName = data.name.replace(/[^a-zA-Z0-9]/g, '_');

      if (format === 'png') {
        addToast({ type: 'info', title: 'Downloading PNG', message: 'Rendering high-resolution ID card PNG...' });

        // Download front PNG or back PNG
        const targetRef = side === 'back' ? cardBackRef : cardFrontRef;
        if (targetRef.current) {
          const dataUrl = await captureCardImage(targetRef.current);
          const link = document.createElement('a');
          link.download = `SPECS_ID_${safeName}_${side}_${orientation}.png`;
          link.href = dataUrl;
          link.click();
        }

        // If 'both' sides selected in PNG mode, also download back PNG
        if (side === 'both' && cardBackRef.current) {
          const backDataUrl = await captureCardImage(cardBackRef.current);
          const linkBack = document.createElement('a');
          linkBack.download = `SPECS_ID_${safeName}_back_${orientation}.png`;
          linkBack.href = backDataUrl;
          linkBack.click();
        }

        addToast({ type: 'success', title: 'Downloaded', message: 'ID card PNG saved successfully.' });
      } else {
        // PDF Export Mode (Back-to-back double-sided)
        addToast({ type: 'info', title: 'Downloading PDF', message: 'Generating printable double-sided PDF...' });

        const { jsPDF } = await import('jspdf');

        const pdfW = orientation === 'portrait' ? 153 : 243;
        const pdfH = orientation === 'portrait' ? 243 : 153;

        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'pt',
          format: [pdfW, pdfH]
        });

        // Page 1: Front
        if (cardFrontRef.current) {
          const frontDataUrl = await captureCardImage(cardFrontRef.current);
          pdf.addImage(frontDataUrl, 'PNG', 0, 0, pdfW, pdfH);
        }

        // Page 2: Back (if available)
        if (cardBackRef.current) {
          pdf.addPage([pdfW, pdfH], orientation);
          const backDataUrl = await captureCardImage(cardBackRef.current);
          pdf.addImage(backDataUrl, 'PNG', 0, 0, pdfW, pdfH);
        }

        pdf.save(`SPECS_ID_${safeName}_${orientation}.pdf`);
        addToast({ type: 'success', title: 'Downloaded', message: 'Printable ID Card PDF saved.' });
      }
    } catch (err: any) {
      console.error('Download Error:', err);
      addToast({ type: 'error', title: 'Download Failed', message: err.message || 'Could not download file.' });
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-full sm:h-auto max-h-[96vh] flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#0d6b66]" />
              Export SPECS ID Card
            </h2>
            <p className="text-[11px] text-slate-500 font-bold">
              Horizontal CR80 Attendance Pass (3.375" × 2.125") • Printable SPECS Event Pass
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-4 space-y-4 lg:border-r lg:border-slate-200 lg:pr-6">
            {/* Download Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                File Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    format === 'pdf'
                      ? 'bg-[#0d6b66] text-white border-[#0d6b66] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  PDF (Printable)
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    format === 'png'
                      ? 'bg-[#0d6b66] text-white border-[#0d6b66] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  PNG (Image)
                </button>
              </div>
            </div>

            {/* Standard Badge Specifications */}
            <div className="p-3 bg-[#0d6b66]/5 rounded-xl border border-[#0d6b66]/20 text-left space-y-1">
              <span className="text-[10px] font-black text-[#0d6b66] uppercase tracking-wider block">
                Horizontal Event & Attendance Pass Standard
              </span>
              <p className="text-[11px] text-slate-600 font-semibold leading-snug">
                CR80 Landscape Badge (3.375" × 2.125") with 50/50 layout: basic details on the left, large Attendance QR code on the right, and policy disclaimers on the back.
              </p>
            </div>

            {/* View Side */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Preview Display
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSide('front')}
                  className={`px-2 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    side === 'front'
                      ? 'bg-[#0d6b66] text-white border-[#0d6b66]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setSide('back')}
                  className={`px-2 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    side === 'back'
                      ? 'bg-[#0d6b66] text-white border-[#0d6b66]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Back (QR)
                </button>
                <button
                  type="button"
                  onClick={() => setSide('both')}
                  className={`px-2 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    side === 'both'
                      ? 'bg-[#0d6b66] text-white border-[#0d6b66]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Both Sides
                </button>
              </div>
            </div>

            {/* Photo Attachment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                2x2 Photo Box
              </label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="text-[11px] text-slate-600 font-semibold leading-tight">
                  Defaults to a blank 2x2 box for picture pasting. You can optionally attach a digital headshot.
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer transition-colors shadow-xs">
                    <Upload className="h-3.5 w-3.5 text-[#0d6b66]" />
                    {customPhotoUrl ? 'Change Photo' : 'Attach 2x2 Photo'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {customPhotoUrl && (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Card Canvas Container with Dynamic Scaling */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-100/90 p-2 sm:p-4 rounded-2xl border border-slate-200 overflow-hidden min-h-[420px] relative">
            <div className={`transition-all duration-300 origin-center flex items-center justify-center ${
              side === 'both'
                ? orientation === 'portrait'
                  ? 'scale-[0.48] min-[360px]:scale-[0.58] sm:scale-[0.72] md:scale-[0.78] lg:scale-[0.80]'
                  : 'scale-[0.42] min-[360px]:scale-[0.52] min-[440px]:scale-[0.65] sm:scale-[0.75] md:scale-[0.82] lg:scale-[0.85]'
                : orientation === 'portrait'
                  ? 'scale-[0.65] sm:scale-95 md:scale-[0.95]'
                  : 'scale-[0.50] min-[360px]:scale-[0.62] sm:scale-85 md:scale-90'
            }`}>
              <IDCardPreview
                data={data}
                orientation={orientation}
                side={side}
                customPhotoUrl={customPhotoUrl}
                cardFrontRef={cardFrontRef}
                cardBackRef={cardBackRef}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0d6b66] hover:bg-[#0b5c58] text-white rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
