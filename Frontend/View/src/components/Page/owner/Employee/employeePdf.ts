import { GState, jsPDF } from "jspdf";
import fruitBackground from "../../../../assets/Pastel Fruit Basket with Floating Leaves.png";
import type { IssuedEmployeeId } from "../../../../connection/auth";

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to load the fruit watermark."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to prepare the fruit watermark."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

export async function downloadEmployeePdf(employee: IssuedEmployeeId): Promise<void> {
  const imageResponse = await fetch(fruitBackground);
  if (!imageResponse.ok) {
    throw new Error("Unable to load the fruit image for the employee PDF.");
  }
  const backgroundData = await readAsDataUrl(await imageResponse.blob());

  const document = new jsPDF();
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const left = 20;
  const labelWidth = 45;
  const valueWidth = pageWidth - left * 2 - labelWidth;

  function addPageBackground() {
    document.setGState(new GState({ opacity: 0.12 }));
    document.addImage(backgroundData, "PNG", 0, 0, pageWidth, pageHeight);
    document.setGState(new GState({ opacity: 1 }));
    document.setTextColor(22, 104, 57);
    document.setFont("helvetica", "bold");
    document.setFontSize(22);
    document.text("INDKAN", left, 28);
    document.setFontSize(16);
    document.text("EMPLOYEE DETAILS", left, 48);
    document.setDrawColor(22, 131, 67);
    document.line(left, 55, pageWidth - left, 55);
  }

  addPageBackground();
  let y = 76;
  const rows: Array<[string, string]> = [
    ["Employee name", employee.employee_name],
    ["Date of birth", employee.date_of_birth],
    ["Address", employee.address],
    ["Phone", employee.phone],
    ["Employee type", employee.employee_type.replaceAll("-", " ")],
    ["Joining date", employee.joining_date],
    ["Employee ID", employee.employee_id],
    ["Owner email", employee.email],
  ];

  for (const [label, value] of rows) {
    const lines = document.splitTextToSize(value, valueWidth);
    const rowHeight = Math.max(9, lines.length * 6) + 10;
    if (y + rowHeight > pageHeight - 30) {
      document.addPage();
      addPageBackground();
      y = 76;
    }

    document.setTextColor(35, 57, 43);
    document.setFontSize(11);
    document.setFont("helvetica", "bold");
    document.text(`${label}:`, left, y);
    document.setFont("helvetica", "normal");
    document.text(lines, left + labelWidth, y);
    y += rowHeight;
  }

  document.setFontSize(9);
  document.setTextColor(90, 110, 97);
  document.text(
    "This employee ID is unique and can be used once to register the generated owner email.",
    left,
    pageHeight - 22,
    { maxWidth: pageWidth - left * 2 },
  );
  document.save(`indkan-employee-${employee.employee_id}.pdf`);
}
