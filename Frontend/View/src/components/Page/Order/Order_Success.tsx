import OrderStatusTable from "./OrderStatusTable";

function OrderSuccess() {
  return (
    <OrderStatusTable
      status="successful"
      title="Successfully delivered"
      description="Review delivered products and share your feedback about the product and distributor."
      feedbackEnabled
    />
  );
}

export default OrderSuccess;
