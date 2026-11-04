import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

const EMPTY = {
  first_name: '', last_name: '', email: '', phone_number: '',
  hire_date: '', job_title: '', salary: '', department_id: ''
};

export default function EmployeesPage({ notify }) {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ page, pageSize, search });
      const r = await api.get('/api/employees?' + q);
      setRows(r.data);
      setTotal(r.total);
      setTotalPages(r.totalPages);
      if (page > r.totalPages) setPage(r.totalPages);
    } catch (e) { notify(e.message, 'err'); }
  }, [page, pageSize, search, notify]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/api/departments').then(setDepartments).catch(e => notify(e.message, 'err'));
  }, [notify]);

  const openAdd = () => { setEditingId(null); setForm({ ...EMPTY }); };
  const openEdit = r => {
    setEditingId(r.employee_id);
    setForm({
      first_name: r.first_name || '', last_name: r.last_name || '', email: r.email || '',
      phone_number: r.phone_number || '', hire_date: r.hire_date || '', job_title: r.job_title || '',
      salary: r.salary ?? '', department_id: r.department_id ?? ''
    });
  };
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/employees/${editingId}`, form);
        notify('Employee updated.');
      } else {
        await api.post('/api/employees', form);
        notify('Employee added.');
      }
      setForm(null);
      load();
    } catch (err) { notify(err.message, 'err'); }
    finally { setSaving(false); }
  };

  const remove = async r => {
    if (!window.confirm(`Delete ${r.first_name || ''} ${r.last_name}?`)) return;
    try {
      await api.del(`/api/employees/${r.employee_id}`);
      notify('Employee deleted.');
      load();
    } catch (err) { notify(err.message, 'err'); }
  };

  return (
    <section>
      <div className="toolbar">
        <input
          type="search" placeholder="Search name or email..."
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
        />
        <button className="btn primary" onClick={openAdd}>+ Add employee</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Hired</th>
              <th>Job</th><th>Salary</th><th>Department</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="9" className="empty">No employees found.</td></tr>}
            {rows.map(r => (
              <tr key={r.employee_id}>
                <td>{r.employee_id}</td>
                <td>{r.first_name} {r.last_name}</td>
                <td>{r.email}</td>
                <td>{r.phone_number}</td>
                <td>{r.hire_date}</td>
                <td>{r.job_title}</td>
                <td>{r.salary != null ? Number(r.salary).toLocaleString() : ''}</td>
                <td>{r.department_name}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => openEdit(r)}>Edit</button>
                  <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <span>{total} employee{total === 1 ? '' : 's'}</span>
        <div>
          <label>Rows per page{' '}
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span> Page {page} of {totalPages} </span>
          <button className="btn small" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="dialog" onClick={e => e.stopPropagation()} onSubmit={save}>
            <h2>{editingId ? 'Edit employee' : 'Add employee'}</h2>
            <div className="grid">
              <label>First name<input name="first_name" value={form.first_name} onChange={change} maxLength="30" /></label>
              <label>Last name *<input name="last_name" value={form.last_name} onChange={change} maxLength="30" required /></label>
              <label>Email *<input name="email" type="email" value={form.email} onChange={change} maxLength="50" required /></label>
              <label>Phone<input name="phone_number" value={form.phone_number} onChange={change} maxLength="20" /></label>
              <label>Hire date<input name="hire_date" type="date" value={form.hire_date} onChange={change} /></label>
              <label>Job title<input name="job_title" value={form.job_title} onChange={change} maxLength="50" /></label>
              <label>Salary<input name="salary" type="number" min="0" step="0.01" value={form.salary} onChange={change} /></label>
              <label>Department
                <select name="department_id" value={form.department_id} onChange={change}>
                  <option value="">-- none --</option>
                  {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                </select>
              </label>
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
