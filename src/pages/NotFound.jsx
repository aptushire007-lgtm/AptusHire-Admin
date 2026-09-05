import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";

// Without a catch-all route, an unmatched authenticated path rendered the dashboard shell
// with a completely blank content area — indistinguishable from a screen that failed to load.
export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <Card className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F2EC]"><Compass className="h-6 w-6 text-[#176B45]" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-[#17221C]">Page not found</h1>
      <p className="mt-2 text-sm text-[#64736A]">Nothing lives at <code className="rounded bg-[#E8F2EC] px-1.5 py-0.5 text-[#64736A]">{pathname}</code>.
        It may have been moved, or the link may be out of date.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button as={Link} to="/">
          Back to dashboard
        </Button>
        <Button as={Link} to="/jobs" variant="outline">
          View jobs
        </Button>
      </div>
    </Card>
  );
}
