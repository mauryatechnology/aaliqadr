"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the checked `ids` boxes that belong to a form by id (they may sit anywhere in the
 * page, e.g. a server-rendered table), and wires the "select all on page" box.
 */
export function useFormSelection(formId: string) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) return;
      const boxes = [...form.elements].filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.name === "ids");
      setIds(boxes.filter((b) => b.checked).map((b) => b.value));
      const all = [...form.elements].find((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.dataset.selectAll !== undefined);
      if (all) {
        all.checked = boxes.length > 0 && boxes.every((b) => b.checked);
        all.indeterminate = boxes.some((b) => b.checked) && !all.checked;
      }
    };
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.form?.id !== formId) return;
      if (t.dataset.selectAll !== undefined) {
        for (const el of t.form.elements) if (el instanceof HTMLInputElement && el.name === "ids") el.checked = t.checked;
      }
      read();
    };
    document.addEventListener("change", onChange);
    read();
    return () => document.removeEventListener("change", onChange);
  }, [formId]);

  function clear() {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (form) for (const el of form.elements) if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = false;
    setIds([]);
  }
  return { ids, clear };
}
