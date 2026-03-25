// Visual preview that mirrors the server-side buildInvoiceChildren + buildFooter layout.
// Uses placeholder recipient, items, and invoice number — real data comes from settings.
// Renders one A4 page per chunk of content that fits within the printable area.

import { useLayoutEffect, useRef, useState } from "react";

interface InvoicePreviewSettings {
  senderName: string;
  street: string;
  zip: string;
  city: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  iban: string | null;
  bankName: string | null;
  paymentTermsDays: number;
  introText: string | null;
  closingText: string | null;
  hasLogo: boolean;
}

interface InvoicePreviewProps {
  settings: InvoicePreviewSettings;
}

// A4 at 72 dpi (matches PDF output dimensions)
const PAGE_W = 595;
const PAGE_H = 841;
const M_TOP = 72;   // 1in
const M_BOTTOM = 72; // 1in
const M_LEFT = 72;   // 1in
const M_RIGHT = 90;  // 1.25in
const INNER_W = PAGE_W - M_LEFT - M_RIGHT; // 433px
const INNER_H = PAGE_H - M_TOP - M_BOTTOM; // 697px
// Reserve space at the bottom of every page for the footer block
const FOOTER_RESERVE = 58;
// Available height for flowing main content per page
const MAIN_H = INNER_H - FOOTER_RESERVE; // 639px

const PLACEHOLDER_FIRST = "Max";
const PLACEHOLDER_LAST = "Muster";
const PLACEHOLDER_TOTAL = "CHF 60.00";

function interpolateIntroText(text: string): string {
  return text
    .replace(/\{\{firstName\}\}/g, PLACEHOLDER_FIRST)
    .replace(/\{\{lastName\}\}/g, PLACEHOLDER_LAST);
}

function formatToday(): string {
  return new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function InvoicePreview({ settings }: InvoicePreviewProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

  // After each render, check if the hidden measurement div overflows MAIN_H.
  // Only update state when the value actually changes to avoid infinite loops.
  useLayoutEffect(() => {
    if (measureRef.current) {
      const h = measureRef.current.offsetHeight;
      const next = Math.max(1, Math.ceil(h / MAIN_H));
      if (next !== pageCount) setPageCount(next);
    }
  });

  const today = formatToday();
  const senderLines = [
    settings.senderName,
    settings.street,
    `${settings.zip} ${settings.city}`.trim(),
  ].filter(Boolean);

  const metaRightLines: string[] = [`Lieferdatum: ${today}`];
  if (settings.email) metaRightLines.push(`E-Mail: ${settings.email}`);
  if (settings.phone) metaRightLines.push(`Tel: ${settings.phone}`);

  const introText = settings.introText
    ? interpolateIntroText(settings.introText)
    : null;

  const footerLines: string[] = [];
  if (settings.iban)
    footerLines.push(
      `IBAN: ${settings.iban}${settings.bankName ? `  |  ${settings.bankName}` : ""}`,
    );
  if (settings.email) footerLines.push(settings.email);
  if (settings.phone) footerLines.push(settings.phone);
  if (settings.website) footerLines.push(settings.website);

  // All flowing main content (everything except the footer)
  const mainContentJSX = (
    <div>
      {/* Header: sender left, meta right */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
        <tbody>
          {settings.hasLogo && (
            <tr>
              <td style={{ width: "55%", border: "none" }} />
              <td style={{ width: "45%", textAlign: "right", border: "none" }}>
                <div
                  style={{
                    display: "inline-block",
                    width: "150px",
                    height: "50px",
                    background: "#f0f0f0",
                    border: "1px dashed #ccc",
                    lineHeight: "50px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "9pt",
                    marginBottom: "6px",
                  }}
                >
                  Logo
                </div>
              </td>
            </tr>
          )}
          <tr>
            <td style={{ width: "55%", border: "none", verticalAlign: "top" }}>
              {senderLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </td>
            <td style={{ width: "45%", textAlign: "right", border: "none", verticalAlign: "top" }}>
              {metaRightLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Recipient placeholder */}
      <div>{PLACEHOLDER_FIRST} {PLACEHOLDER_LAST}</div>
      <div>Musterstrasse 1</div>
      <div>1234 Musterort</div>
      <div style={{ marginTop: "16px" }} />

      {/* Invoice title */}
      <div style={{ fontWeight: "bold", fontSize: "16pt", marginBottom: "12px" }}>
        Rechnung Nr. 1/26
      </div>

      {/* Intro text */}
      {introText && (
        <div style={{ marginBottom: "12px", whiteSpace: "pre-wrap" }}>{introText}</div>
      )}

      {/* Items table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10pt",
          marginBottom: "12px",
        }}
      >
        <tbody>
          <tr>
            {(["Pos.", "Bezeichnung", "Menge", "Einheit", "Preis/Einheit", "Gesamtpreis"] as const).map(
              (h, i) => (
                <td
                  key={h}
                  style={{
                    border: "1px solid #CCCCCC",
                    padding: "3px 4px",
                    fontWeight: "bold",
                    width: ["5%", "30%", "10%", "12%", "21%", "22%"][i],
                    textAlign: i >= 2 ? "right" : "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </td>
              ),
            )}
          </tr>
          <tr>
            {(["1", "Beispielprodukt", "2", "kg", "CHF 25.00", "CHF 50.00"] as const).map((v, i) => (
              <td
                key={i}
                style={{
                  border: "1px solid #CCCCCC",
                  padding: "3px 4px",
                  textAlign: i >= 2 ? "right" : "left",
                  whiteSpace: "nowrap",
                }}
              >
                {v}
              </td>
            ))}
          </tr>
          <tr>
            {(["2", "Lieferung", "1", "Stück", "CHF 10.00", "CHF 10.00"] as const).map((v, i) => (
              <td
                key={i}
                style={{
                  border: "1px solid #CCCCCC",
                  padding: "3px 4px",
                  textAlign: i >= 2 ? "right" : "left",
                  whiteSpace: "nowrap",
                }}
              >
                {v}
              </td>
            ))}
          </tr>
          <tr>
            <td
              colSpan={5}
              style={{
                border: "1px solid #CCCCCC",
                padding: "3px 4px",
                fontWeight: "bold",
                textAlign: "right",
              }}
            >
              Rechnungsbetrag
            </td>
            <td
              style={{
                border: "1px solid #CCCCCC",
                padding: "3px 4px",
                fontWeight: "bold",
                textAlign: "right",
              }}
            >
              {PLACEHOLDER_TOTAL}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Payment terms */}
      <div style={{ marginBottom: "12px" }}>
        {`Der Gesamtbetrag von ${PLACEHOLDER_TOTAL} ist innert ${settings.paymentTermsDays} Tage zahlbar.`}
      </div>

      {/* Closing text */}
      {settings.closingText && (
        <div style={{ whiteSpace: "pre-wrap" }}>{settings.closingText}</div>
      )}
    </div>
  );

  const footerJSX =
    footerLines.length > 0 ? (
      <div
        style={{
          borderTop: "1.5px solid #888",
          paddingTop: "6px",
          textAlign: "center",
          fontSize: "9pt",
          color: "#222",
        }}
      >
        {footerLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    ) : null;

  const pageStyle: React.CSSProperties = {
    fontFamily: "sans-serif",
    fontSize: "10pt",
    lineHeight: 1.4,
    background: "white",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    width: `${PAGE_W}px`,
    height: `${PAGE_H}px`,
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div style={{ width: `${PAGE_W}px` }}>
      {/* Hidden measurement div — must match page font styles exactly so offsetHeight is accurate */}
      <div
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          width: `${INNER_W}px`,
          top: 0,
          left: 0,
          fontFamily: "sans-serif",
          fontSize: "10pt",
          lineHeight: 1.4,
        }}
      >
        {mainContentJSX}
      </div>

      {/* One A4 page div per measured page */}
      {Array.from({ length: pageCount }).map((_, pageIdx) => (
        <div
          key={pageIdx}
          style={{
            ...pageStyle,
            marginBottom: pageIdx < pageCount - 1 ? "12px" : 0,
          }}
        >
          {/* Clipping window for main content — shifts content up by pageIdx * MAIN_H */}
          <div
            style={{
              position: "absolute",
              top: M_TOP,
              left: M_LEFT,
              right: M_RIGHT,
              height: MAIN_H,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: -pageIdx * MAIN_H, left: 0, right: 0 }}>
              {mainContentJSX}
            </div>
          </div>

          {/* Footer pinned to the bottom margin of every page */}
          {footerJSX && (
            <div
              style={{
                position: "absolute",
                bottom: M_BOTTOM,
                left: M_LEFT,
                right: M_RIGHT,
              }}
            >
              {footerJSX}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
