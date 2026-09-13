import { useEffect, useRef } from "react";

export default function ErrorSummary({ errors, labels = {}, idPrefix = "", attempt = 0 }) {
  const ref = useRef(null);
  const entries = Object.entries(errors).filter(([, message]) => message);
  useEffect(() => { if (attempt) ref.current?.focus(); }, [attempt]);
  if (!entries.length) return null;
  return <div ref={ref} tabIndex={-1} role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
    <p className="font-semibold">Check {entries.length === 1 ? "this field" : `these ${entries.length} fields`} before continuing</p>
    <ul className="mt-2 list-disc space-y-1 pl-5">{entries.map(([name, message]) => <li key={name}>
      <a href={`#${idPrefix}${name}`} className="underline underline-offset-2" onClick={event => {
        event.preventDefault();
        const control = document.getElementById(`${idPrefix}${name}`);
        let ancestor = control?.parentElement;
        while (ancestor) { if (ancestor.tagName === "DETAILS") ancestor.open = true; ancestor = ancestor.parentElement; }
        control?.focus();
      }}>{labels[name] ? `${labels[name]}: ` : ""}{message}</a>
    </li>)}</ul>
  </div>;
}
