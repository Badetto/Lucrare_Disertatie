import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RefactorPage } from "./features/refactor/RefactorPage";
import { NavBar } from './components/layout/NavBar';
import { RepositoryPage } from './features/repository/RepositoryPage';

function App() {
  return (
    <BrowserRouter>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavBar />
        <div style={{ flex: 1, overflow: 'auto' }}>
            <Routes>
                <Route path="/" element={<RefactorPage />} />
                <Route path="/repository" element={<RepositoryPage />} />
            </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;