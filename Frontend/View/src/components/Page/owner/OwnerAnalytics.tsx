import { useMemo, useState } from "react";
import type { ManagedOrder, Product } from "../../../connection";

const CHART_COLORS = [
  "#168343",
  "#e9a23b",
  "#3e83b7",
  "#bd5b47",
  "#8b69b1",
  "#4ba89a",
  "#d66c9a",
  "#87953d",
];

type SalesItem = {
  productId: string | null;
  productName: string;
  quantity: number;
  revenue: number;
};

function getArea(address: string): string {
  const pin = address.match(/\b\d{6}\b/)?.[0];
  const withoutPin = address.replace(/\b\d{6}\b/g, "").trim();
  const states = new Set([
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
    "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
    "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
    "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
  ]);
  const parts = withoutPin
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const city = [...parts].reverse().find(
    (part) => !states.has(part.toLocaleLowerCase()),
  );
  const area = [city, pin].filter(Boolean).join(" · ");
  return area || "Area not specified";
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function localDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function conicGradient(values: number[]): string {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return "#e7ece7";
  let end = 0;
  return `conic-gradient(${values.map((value, index) => {
    const start = end;
    end += (value / total) * 100;
    return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`;
  }).join(", ")})`;
}

function PieChart({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const values = rows.map((row) => row.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  return (
    <div className="analytics-pie-layout">
      <div
        className="analytics-pie"
        role="img"
        aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(", ")}
        style={{ background: conicGradient(values) }}
      />
      <ul className="analytics-legend">
        {rows.map((row, index) => (
          <li key={row.label}>
            <span
              className="analytics-legend-dot"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span>{row.label}</span>
            <strong>
              {total ? `${((row.value / total) * 100).toFixed(1)}%` : "0%"}
            </strong>
          </li>
        ))}
        {!rows.length && <li>No data available</li>}
      </ul>
    </div>
  );
}

function DonutChart({
  values,
  labels,
  centerLabel,
}: {
  values: number[];
  labels: string[];
  centerLabel: string;
}) {
  return (
    <div className="analytics-donut-layout">
      <div
        className="analytics-donut"
        role="img"
        aria-label={labels.map((label, index) => `${label}: ${values[index]}`).join(", ")}
        style={{ background: conicGradient(values) }}
      >
        <div className="analytics-donut-center">{centerLabel}</div>
      </div>
      <ul className="analytics-legend">
        {labels.map((label, index) => (
          <li key={label}>
            <span
              className="analytics-legend-dot"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span>{label}</span>
            <strong>{values[index].toLocaleString("en-IN")}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarChart({
  rows,
  valueKey,
  color = CHART_COLORS[0],
}: {
  rows: Array<{ label: string; value: number }>;
  valueKey: string;
  color?: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) return <p className="analytics-empty">No data available.</p>;
  return (
    <div className="analytics-bars" role="img" aria-label={valueKey}>
      {rows.map((row) => (
        <div className="analytics-bar-item" key={row.label} title={`${row.label}: ${row.value}`}>
          <div className="analytics-bar-track">
            <span
              className="analytics-bar-fill"
              style={{
                height: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <strong>{row.value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const points = rows.map((row, index) => ({
    x: rows.length < 2 ? 50 : 8 + (index / (rows.length - 1)) * 84,
    y: 82 - (row.value / max) * 68,
  }));
  const path = points.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
  ).join(" ");
  return (
    <div className="analytics-trend">
      {rows.length ? (
        <>
          <svg viewBox="0 0 100 90" role="img" aria-label="Daily sales trend">
            <path d="M 8 82 H 92" className="analytics-axis" />
            <path d={path} className="analytics-line" />
            {points.map((point, index) => (
              <circle
                key={`${rows[index].label}-${index}`}
                cx={point.x}
                cy={point.y}
                r="1.7"
                className="analytics-point"
              >
                <title>{`${rows[index].label}: ${formatCurrency(rows[index].value)}`}</title>
              </circle>
            ))}
          </svg>
          <div className="analytics-trend-labels">
            <span>{rows[0].label}</span>
            <span>{rows[rows.length - 1].label}</span>
          </div>
        </>
      ) : (
        <p className="analytics-empty">No sales in this period.</p>
      )}
    </div>
  );
}

function WaterfallChart({
  rows,
}: {
  rows: Array<{ label: string; stockValue: number; salesValue: number }>;
}) {
  if (!rows.length) return <p className="analytics-empty">No product values to display.</p>;
  const stockTotal = rows.reduce((sum, row) => sum + row.stockValue, 0);
  const salesTotal = rows.reduce((sum, row) => sum + row.salesValue, 0);
  const startTotal = stockTotal + salesTotal;
  const max = Math.max(startTotal, 1);
  const startHeight = (startTotal / max) * 70;
  const stockHeight = (stockTotal / max) * 70;
  const salesHeight = (salesTotal / max) * 70;
  return (
    <div className="analytics-waterfall-content">
      <div className="analytics-chart-key">
        <span><i className="analytics-key-stock" />Product value</span>
        <span><i className="analytics-key-sales" />Delivered sales</span>
        <span><i className="analytics-key-cost" />Remaining stock value</span>
      </div>
      <svg
        className="analytics-waterfall-svg"
        viewBox="0 0 360 150"
        role="img"
        aria-label={`Product value ${formatCurrency(startTotal)}, delivered sales ${formatCurrency(salesTotal)}, remaining stock ${formatCurrency(stockTotal)}`}
      >
        <path d="M 28 116 H 338" className="analytics-axis" />
        <rect x="58" y={116 - startHeight} width="52" height={startHeight} rx="4" className="analytics-key-stock" />
        <line x1="110" y1={116 - startHeight} x2="165" y2={116 - startHeight} className="analytics-waterfall-connector" />
        <rect x="165" y={116 - startHeight} width="52" height={salesHeight} rx="4" className="analytics-key-sales" />
        <line x1="217" y1={116 - stockHeight} x2="272" y2={116 - stockHeight} className="analytics-waterfall-connector" />
        <rect x="272" y={116 - stockHeight} width="52" height={stockHeight} rx="4" className="analytics-key-cost" />
        <text x="84" y="134" textAnchor="middle">Total product value</text>
        <text x="191" y="134" textAnchor="middle">Sales (deducted)</text>
        <text x="298" y="134" textAnchor="middle">In stock</text>
        <text x="84" y={Math.max(116 - startHeight - 7, 10)} textAnchor="middle">{formatCurrency(startTotal)}</text>
        <text x="191" y={Math.max(116 - startHeight + salesHeight / 2, 10)} textAnchor="middle">{formatCurrency(salesTotal)}</text>
        <text x="298" y={Math.max(116 - stockHeight - 7, 10)} textAnchor="middle">{formatCurrency(stockTotal)}</text>
      </svg>
      <div className="analytics-waterfall-table">
        <div><strong>Product</strong><strong>Current stock</strong><strong>Delivered sales</strong></div>
        {rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <span>{formatCurrency(row.stockValue)}</span>
            <span>{formatCurrency(row.salesValue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfitComparison({
  rows,
}: {
  rows: Array<{ label: string; cost: number | null; price: number }>;
}) {
  const max = Math.max(...rows.flatMap((row) => [row.price, row.cost ?? 0]), 1);
  if (!rows.length) return <p className="analytics-empty">No products available.</p>;
  return (
    <>
      <div className="analytics-chart-key">
        <span><i className="analytics-key-cost" />Cost price</span>
        <span><i className="analytics-key-sales" />Selling price</span>
      </div>
      <div className="analytics-bars analytics-comparison">
        {rows.map((row) => (
          <div className="analytics-bar-item" key={row.label}>
            <div className="analytics-waterfall-bars">
              <span
                className="analytics-bar-fill analytics-key-cost"
                style={{ height: `${(row.cost ?? 0) / max * 100}%` }}
                title={`${row.label} cost price: ${row.cost === null ? "Not entered" : formatCurrency(row.cost)}`}
              />
              <span
                className="analytics-bar-fill analytics-key-sales"
                style={{ height: `${row.price / max * 100}%` }}
                title={`${row.label} selling price: ${formatCurrency(row.price)}`}
              />
            </div>
            <span>{row.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function OwnerAnalytics({
  products,
  orders,
  ordersLoading,
  ordersError,
}: {
  products: Product[];
  orders: ManagedOrder[];
  ordersLoading: boolean;
  ordersError: string;
}) {
  const [selectedArea, setSelectedArea] = useState("all");
  const [today] = useState(() => new Date());
  const areas = useMemo(
    () => [...new Set(orders.map((order) => getArea(order.delivery_address)))].sort(),
    [orders],
  );
  const areaOrders = useMemo(
    () => selectedArea === "all"
      ? orders
      : orders.filter((order) => getArea(order.delivery_address) === selectedArea),
    [orders, selectedArea],
  );

  const sales = useMemo(() => {
    const byProduct = new Map<string, SalesItem>();
    for (const order of areaOrders) {
      if (order.status !== "successful" && order.status !== "return_requested") continue;
      for (const item of order.items) {
        if (item.fulfillment_status !== "delivered") continue;
        const key = item.product_id ?? item.product_name;
        const row = byProduct.get(key) ?? {
          productId: item.product_id,
          productName: item.product_name,
          quantity: 0,
          revenue: 0,
        };
        row.quantity += item.quantity;
        row.revenue += Number(item.subtotal);
        byProduct.set(key, row);
      }
    }
    return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  }, [areaOrders]);

  const inventoryProducts = useMemo(() => {
    if (selectedArea === "all") return products;
    const soldNames = new Set(sales.map((row) => row.productName));
    const soldIds = new Set(sales.flatMap((row) => row.productId ? [row.productId] : []));
    return products.filter((product) =>
      soldIds.has(product.id) || soldNames.has(product.name),
    );
  }, [products, sales, selectedArea]);
  const totalSales = sales.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnitsSold = sales.reduce((sum, row) => sum + row.quantity, 0);
  const deliveredOrders = areaOrders.filter((order) => order.status === "successful");
  const returnRequestedOrders = areaOrders.filter(
    (order) => order.status === "return_requested",
  );
  const cancelledOrders = areaOrders.filter((order) => order.status === "cancelled");
  const pendingOrders = areaOrders.filter((order) => order.status === "pending");
  const returnedOrders = areaOrders.filter((order) => order.status === "returned");
  const profitRows = products.flatMap((product) => {
    if (product.cost_price === null || product.cost_price === undefined) {
      return [];
    }
    return [{
      label: `${product.name} ${Number(product.price) < Number(product.cost_price) ? "loss" : "profit"}`,
      value: (Number(product.price) - Number(product.cost_price)) * product.stock_quantity,
    }];
  });
  const knownProfit = profitRows.reduce((sum, row) => sum + row.value, 0);
  const salesByDay = new Map<string, number>();
  for (let offset = 13; offset >= 0; offset--) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    salesByDay.set(localDateKey(day), 0);
  }
  for (const order of areaOrders) {
    if (order.status !== "successful" && order.status !== "return_requested") continue;
    const date = localDateKey(new Date(order.updated_at));
    if (salesByDay.has(date)) {
      salesByDay.set(date, (salesByDay.get(date) ?? 0) + Number(order.total_amount));
    }
  }
  const trendRows = [...salesByDay].map(([date, value]) => ({
    label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
    value,
  }));
  const soldNames = new Set(sales.map((row) => row.productName));
  const soldIds = new Set(sales.flatMap((row) => row.productId ? [row.productId] : []));
  const activeProducts = products.filter((product) =>
    selectedArea === "all" ||
    soldIds.has(product.id) ||
    soldNames.has(product.name),
  );
  const waterfallRows = activeProducts.map((product) => ({
    label: product.name,
    stockValue: product.stock_quantity * Number(product.price),
    salesValue: sales.find((sale) =>
      sale.productId ? sale.productId === product.id : sale.productName === product.name,
    )?.revenue ?? 0,
  }));

  return (
    <section className="owner-analytics" aria-labelledby="analytics-title">
      <div className="analytics-toolbar">
        <div>
          <h2 id="analytics-title">Business dashboard</h2>
          <p>Sales and inventory update from live order status changes. Return requests stay in sales until confirmed.</p>
        </div>
        <label>
          Filter by delivery area
          <select value={selectedArea} onChange={(event) => setSelectedArea(event.currentTarget.value)}>
            <option value="all">All areas</option>
            {areas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
        </label>
      </div>

      {ordersError && <p className="owner-error" role="alert">{ordersError}</p>}
      {ordersLoading && <p className="analytics-loading">Loading sales data...</p>}
      <div className="analytics-summary">
        <div><span>Delivered sales</span><strong>{formatCurrency(totalSales)}</strong></div>
        <div><span>Units sold</span><strong>{totalUnitsSold.toLocaleString("en-IN")}</strong></div>
        <div>
          <span>Estimated inventory profit</span>
          <strong>{profitRows.length ? formatCurrency(knownProfit) : "Cost needed"}</strong>
        </div>
      </div>

      <div className="analytics-grid">
        <article className="analytics-card">
          <h3>Stock quantity by product</h3>
          <p>Current global inventory; stock is not tracked by delivery area.</p>
          <BarChart rows={inventoryProducts.map((product) => ({
            label: product.name,
            value: product.stock_quantity,
          }))} valueKey="Available stock quantity" />
        </article>
        <article className="analytics-card">
          <h3>Sales mix by product</h3>
          <p>Delivered units, including returns awaiting owner confirmation.</p>
          <PieChart rows={sales.map((row) => ({ label: row.productName, value: row.quantity }))} />
        </article>
        <article className="analytics-card">
          <h3>Total sales</h3>
          <p>Delivered order value in the selected area.</p>
          <DonutChart
            values={[totalSales, Math.max(
              areaOrders.filter(
                (order) =>
                  order.status !== "successful" &&
                  order.status !== "return_requested",
              )
                .reduce((sum, order) => sum + Number(order.total_amount), 0),
              0,
            )]}
            labels={["Delivered sales (₹)", "Other order value (₹)"]}
            centerLabel={formatCurrency(totalSales)}
          />
        </article>
        <article className="analytics-card">
          <h3>Estimated inventory profit by product</h3>
          <p>Current stock × (selling price − cost price from product settings).</p>
          {profitRows.length ? (
            <DonutChart
              values={profitRows.map((row) => Math.abs(row.value))}
              labels={profitRows.map((row) => row.label)}
              centerLabel={formatCurrency(knownProfit)}
            />
          ) : (
            <p className="analytics-empty">Add product cost prices to calculate profit.</p>
          )}
        </article>
        <article className="analytics-card">
          <h3>Daily sales trend</h3>
          <p>Delivered order totals for the last 14 days.</p>
          <TrendChart rows={trendRows} />
        </article>
        <article className="analytics-card">
          <h3>Stock and sales value by product</h3>
          <p>Current stock at selling price compared with delivered sales.</p>
          <WaterfallChart rows={waterfallRows} />
        </article>
        <article className="analytics-card">
          <h3>Order outcomes</h3>
          <p>Cancelled orders and confirmed returns are removed from sales; confirmed returns restore stock.</p>
          <DonutChart
            values={[
              deliveredOrders.length,
              returnRequestedOrders.length,
              cancelledOrders.length,
              returnedOrders.length,
              pendingOrders.length,
            ]}
            labels={["Delivered", "Return requested", "Cancelled", "Returned", "Pending"]}
            centerLabel={`${areaOrders.length} orders`}
          />
        </article>
        <article className="analytics-card">
          <h3>Cost and selling price by product</h3>
          <p>Prices are per product unit; missing costs are shown as zero bars.</p>
          <ProfitComparison rows={activeProducts.map((product) => ({
            label: product.name,
            cost: product.cost_price == null ? null : Number(product.cost_price),
            price: Number(product.price),
          }))} />
        </article>
      </div>
    </section>
  );
}

export default OwnerAnalytics;
