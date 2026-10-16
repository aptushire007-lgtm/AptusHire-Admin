import { useCallback, useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import api from "../../api/client.js";
import { Badge, Card, EmptyState, Skeleton } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";

const STATUS_TONES = {
  created: "amber",
  paid: "green",
  failed: "red",
  cancelled: "slate",
};

function formatAmount(amount, currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BillingHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/payments/history");
      if (!Array.isArray(response.data)) {
        throw new Error("Payment history response was invalid");
      }
      setPayments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not load payment history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Payments"
        description="Payment attempts, status, amounts, and transaction references for your company."
      />

      {error && (
        <Card role="alert" className="border-red-200 bg-red-50 text-sm text-red-700">
          <p>{error}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={loadPayments}>
            Try again
          </Button>
        </Card>
      )}

      {loading ? (
        <Card><Skeleton className="h-36 w-full" /></Card>
      ) : !error && payments.length === 0 ? (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="No payment history"
            description="Payments for this company will appear here."
          />
        </Card>
      ) : (
        !error && (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-[#E5EBE7]">
              {payments.map((payment) => (
                <li key={payment._id} className="space-y-3 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#17221C]">
                        {payment.subscriptionPlan?.name || "Subscription"} · {payment.billingCycle}
                      </p>
                      <p className="mt-1 text-sm text-[#64736A]">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-[#17221C]">
                        {formatAmount(payment.amount, payment.currency)}
                      </span>
                      <Badge tone={STATUS_TONES[payment.status] || "slate"}>{payment.status}</Badge>
                    </div>
                  </div>
                  {(payment.razorpayOrderId || payment.razorpayPaymentId) && (
                    <dl className="grid gap-x-6 gap-y-1 text-xs text-[#64736A] sm:grid-cols-2">
                      {payment.razorpayOrderId && (
                        <div className="min-w-0">
                          <dt className="inline font-medium">Order ID: </dt>
                          <dd className="inline break-all">{payment.razorpayOrderId}</dd>
                        </div>
                      )}
                      {payment.razorpayPaymentId && (
                        <div className="min-w-0">
                          <dt className="inline font-medium">Payment ID: </dt>
                          <dd className="inline break-all">{payment.razorpayPaymentId}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )
      )}
    </div>
  );
}
