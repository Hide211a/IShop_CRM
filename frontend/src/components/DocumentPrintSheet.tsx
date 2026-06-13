import { Box, Divider, Typography } from "@mui/material";
import type { DocumentDetail } from "../types";
import { documentStatusLabels, documentTypeLabels } from "../utils/labels";

interface Props {
  doc: DocumentDetail;
}

export function DocumentPrintSheet({ doc }: Props) {
  const total = doc.lines.reduce(
    (sum, l) => sum + Number(l.unitPrice) * l.quantity,
    0,
  );

  const serialsByProduct = new Map<string, string[]>();
  doc.serials?.forEach((s) => {
    const list = serialsByProduct.get(s.productId) ?? [];
    list.push(s.imei);
    serialsByProduct.set(s.productId, list);
  });

  return (
    <Box className="document-print-sheet">
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography className="print-title">iShop Рівне</Typography>
        <Typography className="print-subtitle">магазин мобільної техніки · м. Рівне</Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography className="print-doc-type">{documentTypeLabels[doc.type]}</Typography>
          <Typography className="print-doc-number">{doc.number}</Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography className="print-meta">
            Статус: {documentStatusLabels[doc.status]}
          </Typography>
          <Typography className="print-meta">
            Дата: {new Date(doc.date).toLocaleString("uk-UA")}
          </Typography>
          {doc.postedAt && (
            <Typography className="print-meta">
              Проведено: {new Date(doc.postedAt).toLocaleString("uk-UA")}
            </Typography>
          )}
        </Box>
      </Box>

      <Box className="print-info-block">
        <Typography className="print-meta">Автор: {doc.createdBy?.fullName ?? "—"}</Typography>
        {doc.supplier && (
          <Typography className="print-meta">Постачальник: {doc.supplier.name}</Typography>
        )}
        {doc.buyerName && (
          <Typography className="print-meta">
            Покупець: {doc.buyerName}
            {doc.buyerPhone ? ` · ${doc.buyerPhone}` : ""}
          </Typography>
        )}
        {doc.notes && (
          <Typography className="print-meta">Примітки: {doc.notes}</Typography>
        )}
      </Box>

      <Divider sx={{ my: 2, borderColor: "#000" }} />

      <table className="print-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Товар</th>
            <th>К-сть</th>
            <th>Ціна</th>
            <th>Сума</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((line, i) => {
            const lineTotal = Number(line.unitPrice) * line.quantity;
            const imeis = serialsByProduct.get(line.productId);
            return (
              <tr key={line.id}>
                <td>{i + 1}</td>
                <td>
                  {line.product?.name ?? "—"}
                  {line.product?.sku && (
                    <span className="print-sku"> ({line.product.sku})</span>
                  )}
                  {imeis?.length ? (
                    <div className="print-imei">IMEI: {imeis.join(", ")}</div>
                  ) : null}
                </td>
                <td className="print-num">{line.quantity}</td>
                <td className="print-num">
                  {Number(line.unitPrice).toLocaleString("uk-UA")} ₴
                </td>
                <td className="print-num">
                  {lineTotal.toLocaleString("uk-UA")} ₴
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="print-total-label">
              Разом:
            </td>
            <td className="print-total-value">
              {total.toLocaleString("uk-UA")} ₴
            </td>
          </tr>
        </tfoot>
      </table>

      <Box sx={{ mt: 5, display: "flex", justifyContent: "space-between" }}>
        <Box>
          <Typography className="print-sign">Відпустив _________________</Typography>
          <Typography className="print-sign-hint">підпис менеджера</Typography>
        </Box>
        <Box>
          <Typography className="print-sign">Отримав _________________</Typography>
          <Typography className="print-sign-hint">підпис / ПІБ</Typography>
        </Box>
      </Box>

      <Typography className="print-footer">
        Документ сформовано в системі iShop Рівне · {new Date().toLocaleString("uk-UA")}
      </Typography>
    </Box>
  );
}
