import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm" className={className}>
        Sign out
      </Button>
    </form>
  );
}
