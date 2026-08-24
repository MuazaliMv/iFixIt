import './admin-system.css';
import './admin-nav-system.css';

export default function AdminLayout({children}:{children:React.ReactNode}){
 return <div className="adminAppSurface">{children}</div>;
}
