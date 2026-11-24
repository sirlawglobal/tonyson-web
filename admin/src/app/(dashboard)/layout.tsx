import { Shell } from '@/components/shell';
import { RequireStaff } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireStaff>
      <Shell>{children}</Shell>
    </RequireStaff>
  );
}
