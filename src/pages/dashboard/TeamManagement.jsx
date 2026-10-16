import { useCallback, useEffect, useState } from "react";
import { UserPlus, UserX } from "lucide-react";
import api from "../../api/client.js";
import { Card } from "../../components/ui/Card.jsx";
import { FormGroup, Input, Label } from "../../components/ui/Field.jsx";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { useToast } from "../../components/ui/Toast.jsx";

export default function TeamManagement() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [seatUsage, setSeatUsage] = useState(null);
  const [seatUsageLoading, setSeatUsageLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/company-settings/members");
      setMembers(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not load company members");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadSeatUsage = useCallback(async () => {
    setSeatUsageLoading(true);
    try {
      const response = await api.get("/subscriptions/usage");
      setSeatUsage(response.data);
    } catch (error) {
      setSeatUsage(null);
      toast.error(error.response?.data?.error || "Could not load company seat usage");
    } finally {
      setSeatUsageLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMembers();
    loadSeatUsage();
  }, [loadMembers, loadSeatUsage]);

  const seats = seatUsage?.dimensions || [];
  const adminSeats = seats.find((dimension) => dimension.dimension === "admins");
  const recruiterSeats = seats.find((dimension) => dimension.dimension === "recruiters");
  const recruiterLimitReached = Boolean(
    recruiterSeats && recruiterSeats.used >= recruiterSeats.limit
  );

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function addRecruiter(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/company-settings/members", form);
      setForm({ name: "", email: "", password: "" });
      toast.success("Recruiter added");
      await Promise.all([loadMembers(), loadSeatUsage()]);
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not add recruiter");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateMember(member) {
    if (!window.confirm(`Deactivate ${member.name}? They will lose access to this workspace.`)) return;
    setDeactivating(member._id);
    try {
      await api.delete(`/company-settings/members/${member._id}`);
      toast.success("Member deactivated");
      await loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not deactivate member");
    } finally {
      setDeactivating("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team management"
        description="Manage company Admins and Recruiters. Adding a member creates a Recruiter account."
      />

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-[#17221C]">Add a recruiter</h2>
        <p className="mt-1 text-sm text-[#64736A]">
          {recruiterSeats
            ? `${seatUsage.planKey === "free_trial" ? "Company" : "Recruiter"} seats: ${recruiterSeats.used} / ${recruiterSeats.limit}`
            : "Seat availability is enforced by your active subscription."}
        </p>
        {adminSeats && (
          <p className="mt-1 text-sm text-[#64736A]">
            Admin seats: {adminSeats.used} / {adminSeats.limit}
          </p>
        )}
        {recruiterLimitReached && (
          <p role="status" className="mt-2 text-sm font-medium text-amber-800">
            Recruiter seat limit reached ({recruiterSeats.used} of {recruiterSeats.limit}). Upgrade your plan to add another recruiter.
          </p>
        )}
        <form onSubmit={addRecruiter} className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormGroup>
            <Label required>Name</Label>
            <Input value={form.name} onChange={update("name")} maxLength={120} required />
          </FormGroup>
          <FormGroup>
            <Label required>Email</Label>
            <Input type="email" value={form.email} onChange={update("email")} required />
          </FormGroup>
          <FormGroup className="sm:col-span-2">
            <Label required>Temporary password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={update("password")}
              autoComplete="new-password"
              required
            />
          </FormGroup>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving} disabled={seatUsageLoading || recruiterLimitReached}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add recruiter
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[#E5EBE7] px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-[#17221C]">Company members</h2>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-[#64736A]">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#64736A]">No company members found.</p>
        ) : (
          <ul className="divide-y divide-[#E5EBE7]">
            {members.map((member) => (
              <li key={member._id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#17221C]">{member.name}</p>
                  <p className="truncate text-sm text-[#64736A]">{member.email}</p>
                  <p className="mt-1 text-xs capitalize text-[#64736A]">
                    {member.role} · {member.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                {member.isActive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={deactivating === member._id}
                    onClick={() => deactivateMember(member)}
                  >
                    <UserX className="h-4 w-4" aria-hidden="true" />
                    Deactivate
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
