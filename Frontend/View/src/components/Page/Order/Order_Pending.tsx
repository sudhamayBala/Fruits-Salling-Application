import OrderStatusTable from "./OrderStatusTable";

function OrderPending() {
  return (
    <OrderStatusTable
      status="pending"
      title="Pending orders"
      description="Products in this list are awaiting delivery."
    />
  );
}

export default OrderPending;
