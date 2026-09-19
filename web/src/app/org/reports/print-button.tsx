"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
    >
      Imprimer / Exporter en PDF
    </button>
  );
}
