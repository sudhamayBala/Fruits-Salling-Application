import OrderStatusTable from "./OrderStatusTable";

function OrderCancel() {
  return (
    <OrderStatusTable
      status="cancelled"
      title="Cancelled orders"
      description="Review cancelled products and share feedback about the product and distributor."
      feedbackEnabled
    />
  );
}

export default OrderCancel;
