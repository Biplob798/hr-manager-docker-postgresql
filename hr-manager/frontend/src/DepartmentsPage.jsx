import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

export default function DepartmentsPage({ notify }) {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    try { setRows(await api.get('/api/departments')); }
    catch (e) { notify(e.message, 'err'); }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const add = async e => {
    e.preventDefault();
    try {
      await api.post('/api/departments', { department_name: name });
      setName('');
      notify('Department added.');
      load();
    } catch (err) { notify(err.message, 'err'); }
  };

  const saveEdit = async id => {
    try {
      await api.put(`/api/departments/${id}`, { department_name: editName });
      setEditId(null);
      notify('Department updated.');
      load();
    } catch (err) { notify(err.message, 'err'); }
  };

  const remove = async d => {
    if (!window.confirm(`Delete department "${d.department_name}"?`)) return;
    try {
      await api.del(`/api/departments/${d.department_id}`);
      notify('Department deleted.');
      load();
    } catch (err) { notify(err.message, 'err'); }
  };

  return (
    <section>
      <form className="toolbar" onSubmit={add}>
        <input placeholder="New department name" value={name} maxLength="50"
               onChange={e => setName(e.target.value)} required />
        <button className="btn primary" type="submit">+ Add department</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Employees</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="4" className="empty">No departments yet.</td></tr>}
            {rows.map(d => (
              <tr key={d.department_id}>
                <td>{d.department_id}</td>
                <td>
                  {editId === d.department_id
                    ? <input value={editName} maxLength="50" autoFocus onChange={e => setEditName(e.target.value)} />
                    : d.department_name}
                </td>
                <td>{d.employee_count}</td>
                <td className="actions">
                  {editId === d.department_id ? (
                    <>
                      <button className="btn small primary" onClick={() => saveEdit(d.department_id)}>Save</button>
                      <button className="btn small" onClick={() => setEditId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn small" onClick={() => { setEditId(d.department_id); setEditName(d.department_name); }}>Rename</button>
                      <button className="btn small danger" onClick={() => remove(d)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
