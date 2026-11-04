import { useState, useCallback } from 'react';
import EmployeesPage from './EmployeesPage.jsx';
import DepartmentsPage from './DepartmentsPage.jsx';

export default function App() {
  const [tab, setTab] = useState('employees');
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, type = 'ok') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <div className="app">
      <header>
        <h1>HR Management</h1>
        <nav>
          <button className={tab === 'employees' ? 'tab active' : 'tab'} onClick={() => setTab('employees')}>Employees</button>
          <button className={tab === 'departments' ? 'tab active' : 'tab'} onClick={() => setTab('departments')}>Departments</button>
        </nav>
      </header>
      <main>
        {tab === 'employees' ? <EmployeesPage notify={notify} /> : <DepartmentsPage notify={notify} />}
      </main>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
