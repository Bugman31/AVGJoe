// Legacy redirect — tab renamed to home
import { Redirect } from 'expo-router';
export default function DashboardRedirect() {
  return <Redirect href="/(app)/home" />;
}
