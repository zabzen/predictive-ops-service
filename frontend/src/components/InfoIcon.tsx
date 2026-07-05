import { INFO_TIPS, type InfoId } from "../content/infoTips";
import { Tooltip } from "./Tooltip";

interface Props {
  id: InfoId;
  className?: string;
}

export function InfoIcon({ id, className = "" }: Props) {
  const tip = INFO_TIPS[id];

  return (
    <Tooltip
      content={
        <>
          <p className="mb-1.5">
            <span className="font-semibold text-slate-900">Technical: </span>
            {tip.technical}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Business: </span>
            {tip.business}
          </p>
        </>
      }
    >
      <button
        type="button"
        aria-label="More information"
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9 9a.75.75 0 000 1.5h.25v3.25a.75.75 0 001.5 0V9.75A.75.75 0 0010 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </Tooltip>
  );
}
