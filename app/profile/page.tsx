import ProfileClient from './ProfileClient';
import ProfileDataEntryCard from './ProfileDataEntryCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ProfilePage(){
  return <>
    <div className="shell accountApp"><ProfileDataEntryCard/></div>
    <ProfileClient/>
  </>;
}
