import { BrowserRouter, useLocation } from 'react-router-dom';
import './App.css';
import HeaderNave from './components/Nav/HeaderNave';
import Footer from './components/Footer/Footer';
import Body_Warper from './components/Warper/Body_Warper';
import Header_Warper from './components/Warper/Header_Warper';
import Nav_Route from './components/route/Nav_Route';

function AppLayout() {
  const { pathname } = useLocation();
  const isAuthPage = ['/', '/login', '/register'].includes(pathname);
  const isLoginPage = pathname === '/' || pathname === '/login';

  if (isAuthPage) {
    return (
      <div className={`app-shell auth-shell${isLoginPage ? ' auth-login-shell' : ''}`}>
        <Body_Warper>
          <Nav_Route />
        </Body_Warper>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header_Warper>
        <HeaderNave />
      </Header_Warper>
      <main className="page-content">
        <Body_Warper>
          <Nav_Route />
        </Body_Warper>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
