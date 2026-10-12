import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

type Employee = {
  id: number;
  full_name: string;
  phone: string | null;
  position: string | null;
};

export default function Employees() {
  const [list, setList] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('id');
    if (error) alert(error.message);
    setList(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { error } = await supabase.from('employees').insert({
      full_name: name.trim(),
      phone: phone.trim() || null,
      position: position.trim() || null,
    });

    if (error) return alert(error.message);

    setName('');
    setPhone('');
    setPosition('');
    load();
  };

  const remove = async (id: number, fullName: string) => {
    if (!confirm(`Удалить сотрудника "${fullName}" и все его слоты?`)) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return alert(error.message);
    load();
  };

  return (
    <div className="container">
      <h2>Сотрудники</h2>

      <form
        onSubmit={add}
        className="card"
        style={{
          marginBottom: 20,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          placeholder="ФИО"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ flex: '1 1 200px', marginRight: 0 }}
        />
        <input
          placeholder="Телефон"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ flex: '1 1 160px', marginRight: 0 }}
        />
        <input
          placeholder="Должность"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          style={{ flex: '1 1 160px', marginRight: 0 }}
        />
        <button type="submit">+ Добавить</button>
      </form>

      {loading ? (
        <p>Загрузка...</p>
      ) : list.length === 0 ? (
        <p style={{ color: '#888' }}>Сотрудников пока нет</p>
      ) : (
        <ul className="emp-list">
          {list.map((e) => (
            <li key={e.id} className="emp-item">
              <Link to={`/admin/employee/${e.id}`}>{e.full_name}</Link>
              {e.position && (
                <span style={{ color: '#888', fontSize: 13 }}>{e.position}</span>
              )}
              <span style={{ marginLeft: 'auto', color: '#666' }}>
                {e.phone}
              </span>
              <button
                className="btn-danger"
                onClick={() => remove(e.id, e.full_name)}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}