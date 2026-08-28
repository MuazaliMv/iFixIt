import ProfileGate from './ProfileGate';
import './profile-usability-fixes.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ProfilePage(){
  return <ProfileGate/>;
}
