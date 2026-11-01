import { Navigate, Route, Routes } from 'react-router-dom';
import About from '../Page/About';
import BulkOrder from '../Page/Bulk_order';
import Cart from '../Page/Cart';
import Checkout from '../Page/Checkout';
import Contact from '../Page/Contact';
import Contract from '../Page/Contract';
import Distributor from '../Page/Distributor';
import DirectMessages from '../Page/DirectMessages';
import ExportQuantity from '../Page/ExportQuantity';
import ExportStatus from '../Page/ExportStatus';
import Gallery from '../Page/Gallery';
import Home from '../Page/Home';
import Login from '../Page/Login/Login';
import Logout from '../Page/Logout';
import OrderCancel from '../Page/Order/Order_Cancel';
import OrderFailure from '../Page/Order/Order_Failure';
import OrderPending from '../Page/Order/Order_Pending';
import OrderSuccess from '../Page/Order/Order_Success';
import Owner from '../Page/owner/Owner';
import Packaging from '../Page/Packaging';
import ProductDetails from '../Page/Product_Details';
import Products from '../Page/Products';
import Register from '../Page/Register';
import PagePlaceholder from '../Page/PagePlaceholder';

function Nav_Route() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/packaging" element={<Packaging />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:productId" element={<ProductDetails />} />
      <Route path="/product-details" element={<ProductDetails />} />
      <Route path="/bulk-order" element={<BulkOrder />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/contract" element={<Contract />} />
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/register" element={<Register />} />
      <Route path="/messages" element={<DirectMessages />} />
      <Route path="/client/messages" element={<DirectMessages />} />
      <Route path="/owner" element={<Owner />} />
      <Route path="/owner/orders" element={<Owner />} />
      <Route path="/owner/products" element={<Owner />} />
      <Route path="/owner/products/new" element={<Owner />} />
      <Route path="/owner/clients" element={<Owner />} />
      <Route path="/owner/distributors" element={<Owner />} />
      <Route path="/owner/packaging" element={<Owner />} />
      <Route path="/owner/coming-soon" element={<Owner />} />
      <Route path="/owner/communications" element={<Owner />} />
      <Route path="/owner/exports" element={<Owner />} />
      <Route path="/owner/settings" element={<Owner />} />
      <Route path="/owner/employee-settings" element={<Owner />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order/success" element={<OrderSuccess />} />
      <Route path="/order/failure" element={<OrderFailure />} />
      <Route path="/order/cancel" element={<OrderCancel />} />
      <Route path="/order/pending" element={<OrderPending />} />
      <Route path="/distributor" element={<Distributor />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/export-quantity" element={<ExportQuantity />} />
      <Route path="/status" element={<ExportStatus />} />
      <Route path="/404" element={<PagePlaceholder title="Page not found" />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default Nav_Route;
