import { redirect } from 'next/navigation';

export default function ProviderTodayRedirect() {
  redirect('/provider/jobs');
}
