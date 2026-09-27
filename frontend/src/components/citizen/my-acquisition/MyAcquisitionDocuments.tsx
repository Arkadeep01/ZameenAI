import React from "react";
import { Link } from "@tanstack/react-router";
import { FileText, ArrowRight, ShieldCheck } from "lucide-react";
import { AcquisitionCase, StageDocument } from "../../../services/acquisition";

interface MyAcquisitionDocumentsProps {
  cases: AcquisitionCase[];
}

interface CaseDocumentWithMeta extends StageDocument {
  caseId: string;
  khasraNumber: string;
}

export const MyAcquisitionDocuments: React.FC<MyAcquisitionDocumentsProps> = ({
  cases,
}) => {
  // Extract all official documents across cases
  const documents: CaseDocumentWithMeta[] = React.useMemo(() => {
    const list: CaseDocumentWithMeta[] = [];
    cases.forEach((c) => {
      (c.stages || []).forEach((stg) => {
        (stg.documents || []).forEach((doc) => {
          list.push({
            ...doc,
            caseId: c.id,
            khasraNumber: c.khasraNumber,
          });
        });
      });
    });
    return list.slice(0, 4);
  }, [cases]);

  return (
    <section
      aria-label="Acquisition Documents"
      className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#1261A8]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Acquisition Documents
          </h2>
        </div>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          Official Records
        </span>
      </div>

      {documents.length === 0 ? (
        <p className="py-3 text-xs text-slate-500">
          No acquisition documents available for your parcels.
        </p>
      ) : (
        <div className="space-y-2.5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-bold text-[#062B52] leading-snug line-clamp-1">
                  {doc.title}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                  <span className="font-mono text-[10px] text-slate-600">
                    {doc.caseId}
                  </span>
                  <span>•</span>
                  <span>{doc.issuedDate}</span>
                  {doc.fileSize && (
                    <>
                      <span>•</span>
                      <span>{doc.fileSize}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-slate-400 hover:text-[#1261A8]">
                <ShieldCheck size={16} className="text-emerald-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          to="/citizen/documents"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#062B52] shadow-xs transition-colors hover:bg-slate-50 hover:text-[#1261A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span>View All Documents</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
};

export default MyAcquisitionDocuments;
