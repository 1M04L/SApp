import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useParams,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { supabase } from './supabase';
import Login from './pages/Login';
import Employees from './pages/Employees';
import Calendar from './pages/Calendar';
import MyCalendar from './pages/MyCalendar';

function RequireRole({ role }: { role: 'admin' | 'employee' }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="container">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== role) return <Navigate to="/" replace />;

  return <Outlet />;
}

function Header() {
  const { user, profile } = useAuth();

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div className="header">
      <div>
        {profile?.role === 'admin' ? (
          <Link to="/admin">📋 Панель администратора</Link>
        ) : (
          <strong>📅 Мой календарь</strong>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#666', fontSize: 14 }}>
          {user.email} ·{' '}
          <strong>
            {profile?.role === 'admin' ? 'Админ' : 'Сотрудник'}
          </strong>
        </span>
        <button onClick={logout}>Выйти</button>
      </div>
    </div>
  );
}

function AdminEmployeeCalendar() {
  const { id } = useParams();
  const empId = Number(id);

  if (!empId) return <Navigate to="/admin" replace />;

  return (
    <div className="container">
      <Link to="/admin" style={{ color: '#0066cc', textDecoration: 'none' }}>
        ← Назад к списку
      </Link>
      <h2 style={{ marginTop: 12 }}>Календарь сотрудника</h2>
      <Calendar employeeId={empId} />
    </div>
  );
}

function RootRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="container">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Navigate to={profile?.role === 'admin' ? '/admin' : '/my'} replace />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<Employees />} />
            <Route
              path="/admin/employee/:id"
              element={<AdminEmployeeCalendar />}
            />
          </Route>

          <Route element={<RequireRole role="employee" />}>
            <Route path="/my" element={<MyCalendar />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}