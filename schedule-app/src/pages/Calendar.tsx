import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

type ClientData = {
  id: number;
  full_name: string;
  class: string | null;
  phone?: string | null;
  hourly_rate?: number | null;
};

type SlotEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    clientId: number | null;
    client: ClientData | null;
  };
};

type ModalMode = 'view' | 'editSlot' | 'createSlot' | 'editClient' | null;

export default function Calendar({ employeeId }: { employeeId: number }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [events, setEvents] = useState<SlotEvent[]>([]);
  const [mode, setMode] = useState<ModalMode>(null);

  // Данные для модалок
  const [currentSlot, setCurrentSlot] = useState<{
    id: string;
    clientId: number | null;
    client: ClientData | null;
    start: Date;
    end: Date;
  } | null>(null);

  // Форма создания/редактирования слота
  const [slotForm, setSlotForm] = useState({
    date: '',
    startTime: '10:00',
    endTime: '11:00',
  });

  // Форма клиента
  const [clientForm, setClientForm] = useState({
    full_name: '',
    phone: '',
    class: '',
    hourly_rate: '',
  });

  // ============================================================
  // ЗАГРУЗКА
  // ============================================================
  const load = async () => {
    const clientFields = isAdmin
      ? 'id, full_name, class, phone, hourly_rate'
      : 'id, full_name, class, phone';

    const { data, error } = await supabase
      .from('slots')
      .select(`id, start_time, end_time, client_id, clients(${clientFields})`)
      .eq('employee_id', employeeId);

    if (error) {
      console.error(error);
      return;
    }

    const mapped: SlotEvent[] = (data ?? []).map((s: any) => ({
      id: String(s.id),
      title: s.clients?.full_name ?? '🟢 Свободно',
      start: s.start_time,
      end: s.end_time,
      extendedProps: {
        clientId: s.client_id,
        client: s.clients,
      },
    }));

    setEvents(mapped);
  };

  useEffect(() => {
    if (employeeId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, isAdmin]);

  // ============================================================
  // DRAG & DROP
  // ============================================================
  const onEventDrop = async (info: any) => {
    const { error } = await supabase
      .from('slots')
      .update({
        start_time: info.event.start.toISOString(),
        end_time: info.event.end.toISOString(),
      })
      .eq('id', Number(info.event.id));

    if (error) {
      alert('Ошибка перемещения: ' + error.message);
      info.revert();
    }
  };

  // ============================================================
  // КЛИК ПО СЛОТУ — открыть карточку
  // ============================================================
  const onEventClick = (info: any) => {
    const client = info.event.extendedProps.client as ClientData | null;

    setCurrentSlot({
      id: info.event.id,
      clientId: info.event.extendedProps.clientId,
      client,
      start: info.event.start,
      end: info.event.end,
    });

    setMode('view');
  };

  // ============================================================
  // КЛИК ПО ПУСТОМУ МЕСТУ — создать слот
  // ============================================================
  const onDateClick = (info: any) => {
    const dateStr = info.dateStr.slice(0, 10); // YYYY-MM-DD
    const timeStr = info.dateStr.slice(11, 16); // HH:MM

    // Конец = начало + 1 час
    const [h] = timeStr.split(':');
    const endHour = String(Number(h) + 1).padStart(2, '0') + ':00';

    setSlotForm({
      date: dateStr,
      startTime: timeStr,
      endTime: endHour,
    });

    setCurrentSlot(null);
    setMode('createSlot');
  };

  // ============================================================
  // СОЗДАНИЕ СЛОТА
  // ============================================================
  const createSlot = async () => {
    const start = new Date(`${slotForm.date}T${slotForm.startTime}:00`);
    const end = new Date(`${slotForm.date}T${slotForm.endTime}:00`);

    if (end <= start) {
      alert('Конец должен быть позже начала');
      return;
    }

    const { error } = await supabase.from('slots').insert({
      employee_id: employeeId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'free',
    });

    if (error) {
      alert(error.message);
      return;
    }

    setMode(null);
    load();
  };

  // ============================================================
  // УДАЛЕНИЕ СЛОТА
  // ============================================================
  const deleteSlot = async () => {
    if (!currentSlot) return;
    if (!confirm('Удалить слот?')) return;

    const { error } = await supabase
      .from('slots')
      .delete()
      .eq('id', Number(currentSlot.id));

    if (error) return alert(error.message);
    setMode(null);
    load();
  };

  // ============================================================
  // РЕДАКТИРОВАНИЕ ВРЕМЕНИ СЛОТА
  // ============================================================
  const startEditSlot = () => {
    if (!currentSlot) return;
    const startDate = new Date(currentSlot.start);
    const endDate = new Date(currentSlot.end);

    setSlotForm({
      date: startDate.toISOString().slice(0, 10),
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
    });
    setMode('editSlot');
  };

  const saveSlotTime = async () => {
    if (!currentSlot) return;
    const start = new Date(`${slotForm.date}T${slotForm.startTime}:00`);
    const end = new Date(`${slotForm.date}T${slotForm.endTime}:00`);

    if (end <= start) {
      alert('Конец должен быть позже начала');
      return;
    }

    const { error } = await supabase
      .from('slots')
      .update({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
      .eq('id', Number(currentSlot.id));

    if (error) return alert(error.message);
    setMode(null);
    load();
  };

  // ============================================================
  // РЕДАКТИРОВАНИЕ КЛИЕНТА
  // ============================================================
  const startEditClient = () => {
    if (!currentSlot) return;
    setClientForm({
      full_name: currentSlot.client?.full_name ?? '',
      phone: currentSlot.client?.phone ?? '',
      class: currentSlot.client?.class ?? '',
      hourly_rate: String(currentSlot.client?.hourly_rate ?? ''),
    });
    setMode('editClient');
  };

  const saveClient = async () => {
    if (!currentSlot) return;
    if (!clientForm.full_name.trim()) {
      alert('Введите имя клиента');
      return;
    }

    const clientPayload: any = {
      full_name: clientForm.full_name.trim(),
      phone: clientForm.phone.trim(),
      class: clientForm.class.trim() || null,
    };

    // Оплату меняет только админ
    if (isAdmin) {
      clientPayload.hourly_rate = clientForm.hourly_rate
        ? Number(clientForm.hourly_rate)
        : 0;
    }

    if (currentSlot.clientId) {
      // Обновляем существующего клиента
      const { error } = await supabase
        .from('clients')
        .update(clientPayload)
        .eq('id', currentSlot.clientId);
      if (error) return alert(error.message);
    } else {
      // Создаём нового и привязываем к слоту
      const { data, error } = await supabase
        .from('clients')
        .insert(clientPayload)
        .select('id')
        .single();
      if (error) return alert(error.message);

      const { error: slotErr } = await supabase
        .from('slots')
        .update({ client_id: data.id, status: 'booked' })
        .eq('id', Number(currentSlot.id));
      if (slotErr) return alert(slotErr.message);
    }

    setMode(null);
    load();
  };

  const clearClient = async () => {
    if (!currentSlot) return;
    if (!confirm('Отвязать клиента от слота?')) return;

    const { error } = await supabase
      .from('slots')
      .update({ client_id: null, status: 'free' })
      .eq('id', Number(currentSlot.id));

    if (error) return alert(error.message);
    setMode(null);
    load();
  };

  // ============================================================
  // РЕНДЕР
  // ============================================================
  return (
    <>
      <div className="card" style={{ padding: 12 }}>
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
          initialView="timeGridWeek"
          firstDay={1}
          slotDuration="01:00:00"
          slotMinTime="00:00:00"
          slotMaxTime="23:59:59"
          allDaySlot={false}
          editable={isAdmin}
          events={events}
          eventDrop={onEventDrop}
          eventClick={onEventClick}
          dateClick={onDateClick}
          height="75vh"
        />
      </div>

      {/* ============ ПРОСМОТР СЛОТА ============ */}
      {mode === 'view' && currentSlot && (
        <div className="modal-overlay" onClick={() => setMode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>👤 {currentSlot.client?.full_name ?? '— свободный слот —'}</h3>

            {currentSlot.client?.class && (
              <p>🎓 Класс: {currentSlot.client.class}</p>
            )}

            <p>
              ⏰ {currentSlot.start.toLocaleString('ru-RU')} —{' '}
              {currentSlot.end.toLocaleTimeString('ru-RU')}
            </p>

            {isAdmin && currentSlot.client && (
              <>
                {currentSlot.client.hourly_rate != null && (
                  <p>
                    <span className="rate-badge">
                      💰 {currentSlot.client.hourly_rate} ₽/час
                    </span>
                  </p>
                )}
                {currentSlot.client.phone && (
                  <p>📞 {currentSlot.client.phone}</p>
                )}
              </>
            )}

            <div className="actions" style={{ flexWrap: 'wrap' }}>
              <button onClick={() => setMode(null)}>Закрыть</button>
              <button onClick={startEditSlot}>Изменить время</button>
              <button onClick={startEditClient}>
                {currentSlot.clientId ? 'Изменить клиента' : 'Назначить клиента'}
              </button>
              {currentSlot.clientId && (
                <button onClick={clearClient}>Отвязать клиента</button>
              )}
              <button className="btn-danger" onClick={deleteSlot}>
                Удалить слот
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ СОЗДАНИЕ СЛОТА ============ */}
      {mode === 'createSlot' && (
        <div className="modal-overlay" onClick={() => setMode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>➕ Новый слот</h3>

            <p>
              <label>Дата:</label>
              <input
                type="date"
                value={slotForm.date}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, date: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>
            <p>
              <label>Начало:</label>
              <input
                type="time"
                value={slotForm.startTime}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, startTime: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>
            <p>
              <label>Конец:</label>
              <input
                type="time"
                value={slotForm.endTime}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, endTime: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>

            <div className="actions">
              <button onClick={() => setMode(null)}>Отмена</button>
              <button onClick={createSlot}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ РЕДАКТИРОВАНИЕ ВРЕМЕНИ ============ */}
      {mode === 'editSlot' && (
        <div className="modal-overlay" onClick={() => setMode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⏰ Изменить время слота</h3>

            <p>
              <label>Дата:</label>
              <input
                type="date"
                value={slotForm.date}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, date: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>
            <p>
              <label>Начало:</label>
              <input
                type="time"
                value={slotForm.startTime}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, startTime: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>
            <p>
              <label>Конец:</label>
              <input
                type="time"
                value={slotForm.endTime}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, endTime: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>

            <div className="actions">
              <button onClick={() => setMode(null)}>Отмена</button>
              <button onClick={saveSlotTime}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ РЕДАКТИРОВАНИЕ КЛИЕНТА ============ */}
      {mode === 'editClient' && (
        <div className="modal-overlay" onClick={() => setMode(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {currentSlot?.clientId ? '✏️ Клиент' : '➕ Новый клиент'}
            </h3>

            <p>
              <label>Имя:</label>
              <input
                type="text"
                placeholder="ФИО клиента"
                value={clientForm.full_name}
                onChange={(e) =>
                  setClientForm({ ...clientForm, full_name: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>
            <p>
              <label>Телефон:</label>
              <input
                type="tel"
                placeholder="+7 ..."
                value={clientForm.phone}
                onChange={(e) =>
                  setClientForm({ ...clientForm, phone: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>
            <p>
              <label>Класс:</label>
              <input
                type="text"
                placeholder="VIP / Стандарт / ..."
                value={clientForm.class}
                onChange={(e) =>
                  setClientForm({ ...clientForm, class: e.target.value })
                }
                style={{ width: '100%', marginRight: 0 }}
              />
            </p>

            {/* Поле оплаты — только для админа */}
            {isAdmin && (
              <p>
                <label>Оплата (₽/час):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={clientForm.hourly_rate}
                  onChange={(e) =>
                    setClientForm({
                      ...clientForm,
                      hourly_rate: e.target.value,
                    })
                  }
                  style={{ width: '100%', marginRight: 0 }}
                />
              </p>
            )}

            <div className="actions">
              <button onClick={() => setMode(null)}>Отмена</button>
              <button onClick={saveClient}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}