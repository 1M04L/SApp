import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import Calendar from './Calendar';

export default function MyCalendar() {
  const { profile } = useAuth();
  const [empId, setEmpId] = useState<number | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!profile?.employee_id) return;

    setEmpId(profile.employee_id);

    supabase
      .from('employees')
      .select('full_name')
      .eq('id', profile.employee_id)
      .single()
      .then(({ data }) => setName(data?.full_name ?? ''));
  }, [profile]);

  if (!empId) {
    return (
      <div className="container">
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Мой календарь — {name}</h2>
      <Calendar employeeId={empId} />
    </div>
  );
}