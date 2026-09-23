import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import { useCompanyName } from "../../context/companyDataContextObject.js";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { Select, Textarea, Label, FieldHint } from "../ui/Field.jsx";
import { fillTemplate, candidateValues } from "../../lib/templates.js";

/**
 * Sending an offer: pick a saved template (offer templates first), adjust the
 * message, send. The message goes out in the offer email and is kept on the
 * candidate's offer record. Any {placeholder} still showing is one this
 * candidate has no value for — the recruiter fills it in by hand.
 */
export default function OfferDialog({ candidate, onClose, onSend }) {
  const [templates, setTemplates] = useState(null);
  const [templateId, setTemplateId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const values = candidateValues(candidate, useCompanyName());
  const name = candidate?.basicDetails?.name || "this candidate";

  useEffect(() => {
    let alive = true;
    api
      .get("/templates")
      .then(({ data }) => {
        if (!alive) return;
        const list = (data.templates || []).sort((a, b) => (b.category === "offer") - (a.category === "offer"));
        setTemplates(list);
        const firstOffer = list.find((t) => t.category === "offer");
        if (firstOffer) choose(firstOffer._id, list);
      })
      .catch(() => alive && setTemplates([]));
    return () => {
      alive = false;
    };
  }, []);

  function choose(id, list = templates) {
    setTemplateId(id);
    const t = list?.find((x) => x._id === id);
    setMessage(t ? fillTemplate(t.body, values) : "");
  }

  async function send() {
    setSending(true);
    try {
      await onSend(message.trim() || undefined);
    } finally {
      setSending(false);
    }
  }

  const unfilled = [...new Set(message.match(/\{\w+\}/g) || [])];

  return (
    <Modal
      open
      onClose={onClose}
      title={`Send offer to ${name}`}
      description="The message is included in the offer email."
      size="2xl"
      busy={sending}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} loading={sending}>
            Send offer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="offer-template">Template</Label>
          <Select id="offer-template" value={templateId} onChange={(e) => choose(e.target.value)} disabled={!templates}>
            <option value="">{templates === null ? "Loading…" : "No template — write a message"}</option>
            {templates?.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>
          {templates?.length === 0 && (
            <FieldHint>
              No saved templates yet.{" "}
              <Link to="/templates" className="font-semibold text-brand-700 hover:underline">
                Create one
              </Link>{" "}
              to reuse your offer letter.
            </FieldHint>
          )}
        </div>
        <div>
          <Label htmlFor="offer-message">Message</Label>
          <Textarea id="offer-message" rows={10} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={10000} />
          {unfilled.length > 0 && (
            <p className="mt-1.5 text-xs text-amber-800">
              Still to fill in: <span className="font-mono">{unfilled.join(" ")}</span>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
