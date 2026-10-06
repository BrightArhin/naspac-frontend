import React, { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  defaultEndorsePlacements,
  reportingDateLabel,
  type EndorseBox,
  type EndorsePlacements,
} from "./endorsePlacements";
import { API_BASE_URL } from "../lib/api-config";

GlobalWorkerOptions.workerSrc = workerSrc;

const apiBase = API_BASE_URL;

type ItemKey = keyof EndorsePlacements;

const signatureItems: { key: ItemKey; label: string }[] = [
  { key: "date", label: reportingDateLabel() },
  { key: "signature", label: "Signature" },
  { key: "stamp", label: "Stamp" },
];

const contactItems: { key: ItemKey; label: string }[] = [
  { key: "company", label: "GHANA COCOA BOARD" },
  { key: "email", label: "cocobod@cocobod.gh" },
  { key: "phone1", label: "0302 - 661 - 752" },
  { key: "phone2", label: "0302 - 661 - 872" },
];

interface EndorsePreviewProps {
  fileUrl: string;
  pages: number[];
  placements: EndorsePlacements;
  onChange: (placements: EndorsePlacements) => void;
}

const EndorsePreview: React.FC<EndorsePreviewProps> = ({
  fileUrl,
  pages,
  placements,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(pages[0] || 1);
  const [pageSize, setPageSize] = useState({
    width: 0,
    height: 0,
    pdfWidth: 595,
  });
  const [error, setError] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pages.includes(pageNumber)) {
      setPageNumber(pages[0] || 1);
    }
  }, [pages, pageNumber]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${apiBase}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((profile) => {
        setSignatureUrl(
          profile.signatureUrl ? `${apiBase}${profile.signatureUrl}` : null,
        );
        setStampUrl(profile.stampUrl ? `${apiBase}${profile.stampUrl}` : null);
      })
      .catch(() => {
        setSignatureUrl(null);
        setStampUrl(null);
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fileUrl) return;
    let cancelled = false;
    const render = async () => {
      try {
        setError("");
        const token = localStorage.getItem("token");
        const response = await fetch(fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error("Could not open the letter");
        const data = new Uint8Array(await response.arrayBuffer());
        const pdf = await getDocument({ data }).promise;
        const safePage = Math.min(Math.max(pageNumber, 1), pdf.numPages);
        const page = await pdf.getPage(safePage);
        const base = page.getViewport({ scale: 1 });
        const scale = 760 / base.width;
        const viewport = page.getViewport({ scale });
        if (cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) {
          setPageSize({
            width: viewport.width,
            height: viewport.height,
            pdfWidth: base.width,
          });
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "Could not show the letter",
          );
        }
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, pageNumber]);

  const lastPage = pages[pages.length - 1];
  const items =
    pages.length > 1 && pageNumber === lastPage ? contactItems : signatureItems;
  const fontScale = pageSize.pdfWidth ? pageSize.width / pageSize.pdfWidth : 1;

  const placementsRef = useRef(placements);
  placementsRef.current = placements;

  const moveItem = (
    key: ItemKey,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const stage = stageRef.current;
    if (!stage) return;
    const box = placementsRef.current[key];
    const start = stage.getBoundingClientRect();
    const offsetX = event.clientX - start.left - box.x * start.width;
    const offsetY = event.clientY - start.top - box.y * start.height;
    const onMove = (moveEvent: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = Math.min(
        0.82,
        Math.max(0, (moveEvent.clientX - rect.left - offsetX) / rect.width),
      );
      const y = Math.min(
        0.9,
        Math.max(0, (moveEvent.clientY - rect.top - offsetY) / rect.height),
      );
      const next = {
        ...placementsRef.current,
        [key]: { ...placementsRef.current[key], x, y },
      };
      placementsRef.current = next;
      onChange(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const resizeItem = (
    key: ItemKey,
    event: React.PointerEvent<HTMLButtonElement>,
    isImage: boolean,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const start = placementsRef.current[key];
    const startX = event.clientX;
    const startY = event.clientY;
    const stage = stageRef.current?.getBoundingClientRect();
    const stageWidth = stage?.width || 1;
    const stageHeight = stage?.height || 1;
    const onMove = (moveEvent: PointerEvent) => {
      const current = placementsRef.current[key];
      let nextBox: EndorseBox;
      if (isImage) {
        nextBox = {
          ...current,
          width: Math.min(
            0.85,
            Math.max(
              0.06,
              (start.width || 0.18) + (moveEvent.clientX - startX) / stageWidth,
            ),
          ),
          height: Math.min(
            0.6,
            Math.max(
              0.05,
              (start.height || 0.1) +
                (moveEvent.clientY - startY) / stageHeight,
            ),
          ),
        };
      } else {
        const pointsPerPixel = pageSize.pdfWidth / stageWidth;
        nextBox = {
          ...current,
          size: Math.min(
            96,
            Math.max(
              10,
              Math.round(
                (start.size || 16) +
                  (moveEvent.clientX - startX + (moveEvent.clientY - startY)) *
                    pointsPerPixel,
              ),
            ),
          ),
        };
      }
      const next = { ...placementsRef.current, [key]: nextBox };
      placementsRef.current = next;
      onChange(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const imageFor = (key: ItemKey) => {
    if (key === "signature") return signatureUrl;
    if (key === "stamp") return stampUrl;
    return null;
  };

  return (
    <div>
      <p className="text-sm text-[#3C3939] mb-2">
        Drag a box to move it. Drag the brown corner on any box, including the
        stamp and signature, to make it larger or smaller.
        {pages.length > 1
          ? ` Page ${lastPage} is for the board name, email, and phone numbers. The other pages get the date, signature, and stamp.`
          : " This page gets the date, signature, and stamp."}
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setPageNumber(page)}
            className={`px-3 py-1 rounded text-sm ${
              pageNumber === page
                ? "bg-[#5B3418] text-white"
                : "bg-[#efeae6] text-[#5B3418]"
            }`}
          >
            Page {page}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="overflow-auto max-h-[70vh] bg-[#f4f1ee] p-2">
        <div ref={stageRef} className="relative inline-block">
          <canvas ref={canvasRef} className="block max-w-full h-auto" />
          {pageSize.width > 0 &&
            items.map((item) => {
              const box: EndorseBox =
                placements[item.key] || defaultEndorsePlacements[item.key];
              const image = imageFor(item.key);
              const isImage = item.key === "signature" || item.key === "stamp";
              return (
                <div
                  key={item.key}
                  onPointerDown={(event) => moveItem(item.key, event)}
                  className="absolute cursor-grab border border-dashed border-[#5B3418] bg-white/70 select-none"
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: isImage ? `${(box.width || 0.18) * 100}%` : "auto",
                    height: isImage ? `${(box.height || 0.1) * 100}%` : "auto",
                    lineHeight: 1.1,
                    padding: isImage ? 0 : "4px 8px",
                    fontWeight: item.key === "company" ? 700 : 600,
                  }}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={item.label}
                      className="h-full w-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span
                      className="pointer-events-none block whitespace-nowrap text-[#5B3418]"
                      style={{
                        fontSize: `${(box.size || 16) * fontScale}px`,
                        lineHeight: 1.1,
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                  {isImage && (
                    <span className="pointer-events-none absolute left-0 top-0 bg-[#5B3418] px-1 text-[10px] leading-4 text-white">
                      {item.label}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Resize ${item.label}`}
                    title="Drag to enlarge or shrink"
                    onPointerDown={(event) =>
                      resizeItem(item.key, event, isImage)
                    }
                    className="absolute -bottom-2 -right-2 z-10 h-4 w-4 cursor-nwse-resize rounded-sm border border-white bg-[#5B3418]"
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default EndorsePreview;
