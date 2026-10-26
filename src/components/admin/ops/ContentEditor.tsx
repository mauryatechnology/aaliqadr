"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { publishPolicyAction, saveContentAction } from "@/actions/admin/engagement";
import type { FormState } from "@/actions/admin/shared";
import { newId } from "@/lib/upload-client";
import { cn } from "@/lib/cn";
import type { PolicySlug, PolicyText } from "@/config/policies";
import { btnPrimary, btnSecondary, Card, FieldLabel, inputCls } from "../ui";
import { FormStatus } from "../FormStatus";
import { useUnsavedGuard } from "../useUnsavedGuard";
import { ChipInput, ImageField, Switch, type ImageValue } from "../widgets";

interface Banner { id: string; title: string; subtitle?: string; cta?: string; href?: string; image?: ImageValue; active: boolean; startsAt?: string; endsAt?: string }
interface Faq { id: string; question: string; answer: string; group: string }
export interface ContentValue {
  announcement: { text: string; href?: string; active: boolean; startsAt?: string; endsAt?: string };
  banners: Banner[];
  faqs: Faq[];
  search: { popular: string[]; synonyms: string[][] };
}

const TABS = [["announcement", "Announcement bar"], ["banners", "Home banners"], ["faqs", "FAQs"], ["search", "Search"], ["policies", "Policies"]] as const;
type Tab = (typeof TABS)[number][0];

/** ISO ↔ datetime-local in India time (IST has no daylight saving). */
const toLocal = (iso?: string) => (iso ? new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : "");

function Schedule({ value, onChange }: { value: { startsAt?: string; endsAt?: string }; onChange: (v: { startsAt: string; endsAt: string }) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FieldLabel label="Show from (optional)" hint="India time"><input type="datetime-local" className={inputCls} value={toLocal(value.startsAt)} onChange={(e) => onChange({ startsAt: fromLocal(e.target.value), endsAt: value.endsAt ?? "" })} /></FieldLabel>
      <FieldLabel label="Hide after (optional)" hint="India time"><input type="datetime-local" className={inputCls} value={toLocal(value.endsAt)} onChange={(e) => onChange({ startsAt: value.startsAt ?? "", endsAt: fromLocal(e.target.value) })} /></FieldLabel>
    </div>
  );
}

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export function ContentEditor({ initial, policies, history }: { initial: ContentValue; policies: Record<PolicySlug, PolicyText & { version: number }>; history: Record<string, { version: number; at: string; by: string }[]> }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("announcement");
  const [c, setC] = useState(initial);
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const [policyKey, setPolicyKey] = useState<PolicySlug>("shipping");
  const [policy, setPolicy] = useState<Record<PolicySlug, PolicyText>>(policies);
  const [saved, setSaved] = useState(() => JSON.stringify([initial, policies]));
  useUnsavedGuard(JSON.stringify([c, policy]) !== saved);
  const p = policy[policyKey];

  const save = () => start(async () => { const res = await saveContentAction({ ...c, search: { ...c.search, synonyms: c.search.synonyms.filter((g) => g.length >= 2) } }); setState(res); if (res.ok) { setSaved(JSON.stringify([c, JSON.parse(saved)[1]])); router.refresh(); } });
  const publish = () => start(async () => { const res = await publishPolicyAction({ key: policyKey, ...p }); setState(res); if (res.ok) { const [savedContent, savedPolicies] = JSON.parse(saved); setSaved(JSON.stringify([savedContent, { ...savedPolicies, [policyKey]: p }])); router.refresh(); } });
  const setPolicyField = (patch: Partial<PolicyText>) => setPolicy({ ...policy, [policyKey]: { ...p, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1" aria-label="Content sections">
        {TABS.map(([k, l]) => <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => { setTab(k); setState({}); }} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", tab === k ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200/70")}>{l}</button>)}
      </nav>

      {tab === "announcement" && (
        <Card title="Announcement bar" actions={<span className="text-xs text-neutral-500">A thin strip above the header on every page</span>}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
            <FieldLabel label="Message" hint={`${c.announcement.text.length}/160`}><input className={inputCls} maxLength={160} value={c.announcement.text} onChange={(e) => setC({ ...c, announcement: { ...c.announcement, text: e.target.value } })} placeholder="Free shipping above ₹1,499 · Diwali gifting is live" /></FieldLabel>
            <FieldLabel label="Link (optional)"><input className={inputCls} value={c.announcement.href ?? ""} onChange={(e) => setC({ ...c, announcement: { ...c.announcement, href: e.target.value || undefined } })} placeholder="/collections/gifting" /></FieldLabel>
            <Switch checked={c.announcement.active} onChange={(active) => setC({ ...c, announcement: { ...c.announcement, active } })} label="Show the bar" />
            <div className="md:col-span-2"><Schedule value={c.announcement} onChange={(w) => setC({ ...c, announcement: { ...c.announcement, ...w } })} /></div>
          </div>
        </Card>
      )}

      {tab === "banners" && (
        <Card title="Home page banners" actions={<span className="text-xs text-neutral-500">Shown as a row of promotions on the home page</span>}>
          <div className="flex flex-col gap-4">
            {c.banners.map((b, i) => (
              <div key={b.id} className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 p-4 md:grid-cols-[240px_1fr]">
                <ImageField value={b.image} prefix="content/banners" aspect="aspect-[4/5]" onChange={(image) => setC({ ...c, banners: c.banners.map((x) => (x.id === b.id ? { ...x, image } : x)) })} />
                <div className="flex flex-col gap-3">
                  <FieldLabel label="Title"><input className={inputCls} maxLength={80} value={b.title} onChange={(e) => setC({ ...c, banners: c.banners.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x)) })} /></FieldLabel>
                  <FieldLabel label="Subtitle"><input className={inputCls} maxLength={200} value={b.subtitle ?? ""} onChange={(e) => setC({ ...c, banners: c.banners.map((x) => (x.id === b.id ? { ...x, subtitle: e.target.value } : x)) })} /></FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldLabel label="Button text"><input className={inputCls} maxLength={30} value={b.cta ?? ""} onChange={(e) => setC({ ...c, banners: c.banners.map((x) => (x.id === b.id ? { ...x, cta: e.target.value } : x)) })} placeholder="Shop the edit" /></FieldLabel>
                    <FieldLabel label="Link"><input className={inputCls} value={b.href ?? ""} onChange={(e) => setC({ ...c, banners: c.banners.map((x) => (x.id === b.id ? { ...x, href: e.target.value } : x)) })} placeholder="/collections/gifting" /></FieldLabel>
                  </div>
                  <Schedule value={b} onChange={(w) => setC({ ...c, banners: c.banners.map((x) => (x.id === b.id ? { ...x, ...w } : x)) })} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Switch checked={b.active} onChange={(active) => setC({ ...c, banners: c.banners.map((x) => (x.id === b.id ? { ...x, active } : x)) })} label="Live" />
                    <span className="flex-1" />
                    <button type="button" aria-label="Move up" onClick={() => setC({ ...c, banners: move(c.banners, i, -1) })} className="rounded p-1.5 hover:bg-neutral-100"><ArrowUp className="size-4" /></button>
                    <button type="button" aria-label="Move down" onClick={() => setC({ ...c, banners: move(c.banners, i, 1) })} className="rounded p-1.5 hover:bg-neutral-100"><ArrowDown className="size-4" /></button>
                    <button type="button" aria-label="Delete banner" onClick={() => setC({ ...c, banners: c.banners.filter((x) => x.id !== b.id) })} className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {c.banners.length < 8 && <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => setC({ ...c, banners: [...c.banners, { id: newId(), title: "", active: true }] })}><Plus className="size-4" /> Add banner</button>}
          </div>
        </Card>
      )}

      {tab === "faqs" && (
        <Card title="Frequently asked questions" actions={<span className="text-xs text-neutral-500">Shown on /faq, grouped, with FAQ rich results for Google</span>}>
          <div className="flex flex-col gap-3">
            {c.faqs.map((f, i) => (
              <div key={f.id} className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 p-3 md:grid-cols-[160px_1fr_auto]">
                <input aria-label="Group" className={inputCls} value={f.group} onChange={(e) => setC({ ...c, faqs: c.faqs.map((x) => (x.id === f.id ? { ...x, group: e.target.value } : x)) })} placeholder="Orders" />
                <div className="flex flex-col gap-2">
                  <input aria-label="Question" className={inputCls} value={f.question} onChange={(e) => setC({ ...c, faqs: c.faqs.map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)) })} placeholder="How long does an Extrait last?" />
                  <textarea aria-label="Answer" rows={3} className={`${inputCls} h-auto py-2`} value={f.answer} onChange={(e) => setC({ ...c, faqs: c.faqs.map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)) })} />
                </div>
                <div className="flex gap-1 md:flex-col">
                  <button type="button" aria-label="Move up" onClick={() => setC({ ...c, faqs: move(c.faqs, i, -1) })} className="rounded p-1.5 hover:bg-neutral-100"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label="Move down" onClick={() => setC({ ...c, faqs: move(c.faqs, i, 1) })} className="rounded p-1.5 hover:bg-neutral-100"><ArrowDown className="size-4" /></button>
                  <button type="button" aria-label="Delete question" onClick={() => setC({ ...c, faqs: c.faqs.filter((x) => x.id !== f.id) })} className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
            <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => setC({ ...c, faqs: [...c.faqs, { id: newId(), question: "", answer: "", group: c.faqs.at(-1)?.group ?? "General" }] })}><Plus className="size-4" /> Add question</button>
          </div>
        </Card>
      )}

      {tab === "search" && (
        <Card title="Storefront search" actions={<span className="text-xs text-neutral-500">Used by the search box on every page</span>}>
          <div className="flex flex-col gap-5">
            <FieldLabel label="Popular searches" hint="Suggested before the shopper types. Press Enter after each.">
              <ChipInput value={c.search.popular} max={12} onChange={(popular) => setC({ ...c, search: { ...c.search, popular } })} placeholder="oud, gift for her, Leo" />
            </FieldLabel>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-neutral-800">Synonyms</p>
              <p className="text-xs text-neutral-500">Words in one group find each other (e.g. rajnigandha, tuberose). Built in already: rashi names, kesar/saffron, chandan/sandalwood, gulab/rose, oud/agarwood and more.</p>
              {c.search.synonyms.map((g, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1"><ChipInput value={g} max={10} lowercase onChange={(words) => setC({ ...c, search: { ...c.search, synonyms: c.search.synonyms.map((x, j) => (j === i ? words : x)) } })} placeholder="word, another word" /></div>
                  <button type="button" aria-label="Delete group" onClick={() => setC({ ...c, search: { ...c.search, synonyms: c.search.synonyms.filter((_, j) => j !== i) } })} className="rounded p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                </div>
              ))}
              <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => setC({ ...c, search: { ...c.search, synonyms: [...c.search.synonyms, []] } })}><Plus className="size-4" /> Add a synonym group</button>
            </div>
          </div>
        </Card>
      )}

      {tab === "policies" && (
        <Card title="Policies" actions={<span className="text-xs text-neutral-500">Publishing creates a new version; old versions are kept</span>}>
          <div className="mb-4 flex flex-wrap gap-1">
            {(Object.keys(policy) as PolicySlug[]).map((k) => <button key={k} type="button" onClick={() => setPolicyKey(k)} className={cn("rounded-lg border px-3 py-1.5 text-sm", policyKey === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300")}>{policy[k].title}</button>)}
          </div>
          <div className="flex flex-col gap-3">
            <FieldLabel label="Title"><input className={inputCls} value={p.title} onChange={(e) => setPolicyField({ title: e.target.value })} /></FieldLabel>
            <FieldLabel label="Summary"><textarea rows={2} className={`${inputCls} h-auto py-2`} value={p.summary} onChange={(e) => setPolicyField({ summary: e.target.value })} /></FieldLabel>
            {p.sections.map((sec, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3">
                <div className="flex gap-2">
                  <input aria-label="Section heading" className={inputCls} value={sec.heading} onChange={(e) => setPolicyField({ sections: p.sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)) })} />
                  <button type="button" aria-label="Move up" onClick={() => setPolicyField({ sections: move(p.sections, i, -1) })} className="rounded p-1.5 hover:bg-neutral-100"><ArrowUp className="size-4" /></button>
                  <button type="button" aria-label="Delete section" onClick={() => setPolicyField({ sections: p.sections.filter((_, j) => j !== i) })} className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                </div>
                <textarea aria-label="Section text" rows={4} className={`${inputCls} h-auto py-2`} value={sec.body} onChange={(e) => setPolicyField({ sections: p.sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
              </div>
            ))}
            <button type="button" className={cn(btnSecondary, "self-start")} onClick={() => setPolicyField({ sections: [...p.sections, { heading: "", body: "" }] })}><Plus className="size-4" /> Add section</button>
            <p className="text-xs text-neutral-500">
              {policies[policyKey].version ? `Live: version ${policies[policyKey].version}.` : "Live: built-in draft (never published)."}
              {(history[policyKey] ?? []).length > 0 && ` History: ${history[policyKey]!.map((h) => `v${h.version} by ${h.by} on ${new Date(h.at).toLocaleDateString("en-IN")}`).join(" · ")}`}
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {tab === "policies" ? (
          <button type="button" className={btnPrimary} disabled={pending} onClick={publish}>{pending && <Loader2 className="size-4 animate-spin" />} Publish {p.title}</button>
        ) : (
          <button type="button" className={btnPrimary} disabled={pending} onClick={save}>{pending && <Loader2 className="size-4 animate-spin" />} Publish changes</button>
        )}
        <FormStatus state={state} />
      </div>
    </div>
  );
}
