import SelectPage from './pages/SelectPage';
import MainPage from './pages/MainPage';
import AdminPage from './pages/AdminPage';
import OrderStatusPage from './pages/OrderStatusPage';

function App() {
  const path = window.location.pathname;

  if (path === '/admin') {
    return <AdminPage />;
  }

  if (path === '/order-status') {
    return <OrderStatusPage />;
  }

  const params = new URLSearchParams(window.location.search);
  const orderer = params.get('orderer');

  if (orderer) {
    return <MainPage initialOrderer={orderer} />;
  }

  return <SelectPage />;
}

export default App;
