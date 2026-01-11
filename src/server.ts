import "dotenv/config";

import express from "express";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

const PORT = 3000;

const TariffCreateSchema = z.object({ name: z.string().min(1).max(200) });
const TariffUpdateSchema = z.object({ name: z.string().min(1).max(200) });

const TypeCreateSchema = z.object({ name: z.string().min(1).max(200) });
const TypeUpdateSchema = z.object({ name: z.string().min(1).max(200) });

const ServiceCreateSchema = z.object({
  typeId: z.string().min(1),
  value: z.coerce.number().finite(),
  unit: z.string().min(1).max(50)
});

const ServiceUpdateSchema = z.object({
  typeId: z.string().min(1).optional(),
  value: z.coerce.number().finite().optional(),
  unit: z.string().min(1).max(50).optional()
});

const MoveServiceSchema = z.object({ targetTariffId: z.string().min(1) });

function uuid() {
  return crypto.randomUUID(); // Node 16+
}

function isMysqlDup(e: any) {
  return e?.code === "ER_DUP_ENTRY";
}
function isFkRestrict(e: any) {
  return e?.code === "ER_ROW_IS_REFERENCED_2";
}

type Tariff = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  services: any[];
};

/** -------------------- TARIFFS -------------------- **/

app.get("/api/tariffs", async (_req, res) => {
  const [rows] = await pool.query<any[]>(
    `SELECT
      t.id as tariffId, t.name as tariffName, t.createdAt as tariffCreatedAt, t.updatedAt as tariffUpdatedAt,
      s.id as serviceId, s.value as serviceValue, s.unit as serviceUnit, s.tariffId as serviceTariffId, s.typeId as serviceTypeId,
      st.id as typeId, st.name as typeName
    FROM tariffs t
    LEFT JOIN services s ON s.tariffId = t.id
    LEFT JOIN service_types st ON st.id = s.typeId
    ORDER BY t.createdAt ASC, s.createdAt ASC`
  );

  const map = new Map<string, Tariff>();
  for (const r of rows) {
    if (!map.has(r.tariffId)) {
      map.set(r.tariffId, {
        id: r.tariffId,
        name: r.tariffName,
        createdAt: r.tariffCreatedAt,
        updatedAt: r.tariffUpdatedAt,
        services: []
      });
    }
    if (r.serviceId) {
      map.get(r.tariffId)!.services.push({
        id: r.serviceId,
        value: r.serviceValue,
        unit: r.serviceUnit,
        tariffId: r.serviceTariffId,
        typeId: r.serviceTypeId,
        type: { id: r.typeId, name: r.typeName }
      });
    }
  }

  res.json([...map.values()]);
});

app.get("/api/tariffs/:id", async (req, res) => {
  const tariffId = req.params.id;

  const [[tariff]] = await pool.query<any[]>(
    "SELECT * FROM tariffs WHERE id = ?",
    [tariffId]
  );
  if (!tariff) return res.status(404).json({ message: "Tariff not found" });

  const [services] = await pool.query<any[]>(
    `SELECT s.*, st.name as typeName
     FROM services s
     JOIN service_types st ON st.id = s.typeId
     WHERE s.tariffId = ?
     ORDER BY s.createdAt ASC`,
    [tariffId]
  );

  res.json({
    ...tariff,
    services: services.map((s) => ({
      id: s.id,
      value: s.value,
      unit: s.unit,
      tariffId: s.tariffId,
      typeId: s.typeId,
      type: { id: s.typeId, name: s.typeName }
    }))
  });
});

app.post("/api/tariffs", async (req, res) => {
  const parsed = TariffCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const id = uuid();
  await pool.query("INSERT INTO tariffs (id, name) VALUES (?, ?)", [id, parsed.data.name]);

  const [[created]] = await pool.query<any[]>("SELECT * FROM tariffs WHERE id = ?", [id]);
  res.status(201).json({ ...created, services: [] });
});

app.put("/api/tariffs/:id", async (req, res) => {
  const parsed = TariffUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [result]: any = await pool.query(
    "UPDATE tariffs SET name = ? WHERE id = ?",
    [parsed.data.name, req.params.id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ message: "Tariff not found" });

  const [[updated]] = await pool.query<any[]>("SELECT * FROM tariffs WHERE id = ?", [req.params.id]);
  res.json(updated);
});

app.delete("/api/tariffs/:id", async (req, res) => {
  const [result]: any = await pool.query("DELETE FROM tariffs WHERE id = ?", [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: "Tariff not found" });
  res.status(204).send();
});

/** -------------------- SERVICE TYPES -------------------- **/

app.get("/api/service-types", async (_req, res) => {
  const [types] = await pool.query<any[]>(
    "SELECT * FROM service_types ORDER BY name ASC"
  );
  res.json(types);
});

app.post("/api/service-types", async (req, res) => {
  const parsed = TypeCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const id = uuid();
    await pool.query("INSERT INTO service_types (id, name) VALUES (?, ?)", [id, parsed.data.name]);
    const [[created]] = await pool.query<any[]>("SELECT * FROM service_types WHERE id = ?", [id]);
    res.status(201).json(created);
  } catch (e: any) {
    if (isMysqlDup(e)) return res.status(409).json({ message: "Service type already exists" });
    throw e;
  }
});

app.put("/api/service-types/:id", async (req, res) => {
  const parsed = TypeUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const [result]: any = await pool.query(
      "UPDATE service_types SET name = ? WHERE id = ?",
      [parsed.data.name, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Service type not found" });

    const [[updated]] = await pool.query<any[]>("SELECT * FROM service_types WHERE id = ?", [req.params.id]);
    res.json(updated);
  } catch (e: any) {
    if (isMysqlDup(e)) return res.status(409).json({ message: "Service type name must be unique" });
    throw e;
  }
});

app.delete("/api/service-types/:id", async (req, res) => {
  try {
    const [result]: any = await pool.query("DELETE FROM service_types WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Service type not found" });
    res.status(204).send();
  } catch (e: any) {
    if (isFkRestrict(e)) {
      return res.status(409).json({ message: "Cannot delete type: it is used by services" });
    }
    throw e;
  }
});

/** -------------------- SERVICES -------------------- **/

app.post("/api/tariffs/:tariffId/services", async (req, res) => {
  const parsed = ServiceCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const tariffId = req.params.tariffId;
  const id = uuid();

  try {
    await pool.query(
      "INSERT INTO services (id, value, unit, tariffId, typeId) VALUES (?, ?, ?, ?, ?)",
      [id, parsed.data.value, parsed.data.unit, tariffId, parsed.data.typeId]
    );

    const [rows] = await pool.query<any[]>(
      `SELECT s.*, st.name as typeName
       FROM services s JOIN service_types st ON st.id = s.typeId
       WHERE s.id = ?`,
      [id]
    );

    const s = rows[0];
    res.status(201).json({
      id: s.id,
      value: s.value,
      unit: s.unit,
      tariffId: s.tariffId,
      typeId: s.typeId,
      type: { id: s.typeId, name: s.typeName }
    });
  } catch (e: any) {
    if (isMysqlDup(e)) {
      return res.status(409).json({ message: "This service type already exists in the tariff" });
    }
    throw e;
  }
});

app.put("/api/services/:id", async (req, res) => {
  const parsed = ServiceUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const fields: string[] = [];
  const values: any[] = [];
  if (parsed.data.typeId !== undefined) { fields.push("typeId = ?"); values.push(parsed.data.typeId); }
  if (parsed.data.value !== undefined)  { fields.push("value = ?"); values.push(parsed.data.value); }
  if (parsed.data.unit !== undefined)   { fields.push("unit = ?"); values.push(parsed.data.unit); }

  if (fields.length === 0) return res.status(400).json({ message: "No fields to update" });

  try {
    values.push(req.params.id);
    const [result]: any = await pool.query(
      `UPDATE services SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });

    const [rows] = await pool.query<any[]>(
      `SELECT s.*, st.name as typeName
       FROM services s JOIN service_types st ON st.id = s.typeId
       WHERE s.id = ?`,
      [req.params.id]
    );
    const s = rows[0];
    res.json({
      id: s.id,
      value: s.value,
      unit: s.unit,
      tariffId: s.tariffId,
      typeId: s.typeId,
      type: { id: s.typeId, name: s.typeName }
    });
  } catch (e: any) {
    if (isMysqlDup(e)) return res.status(409).json({ message: "This service type already exists in the tariff" });
    throw e;
  }
});

app.delete("/api/services/:id", async (req, res) => {
  const [result]: any = await pool.query("DELETE FROM services WHERE id = ?", [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });
  res.status(204).send();
});

app.post("/api/services/:id/move", async (req, res) => {
  const parsed = MoveServiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const [result]: any = await pool.query(
      "UPDATE services SET tariffId = ? WHERE id = ?",
      [parsed.data.targetTariffId, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });

    const [rows] = await pool.query<any[]>(
      `SELECT s.*, st.name as typeName
       FROM services s JOIN service_types st ON st.id = s.typeId
       WHERE s.id = ?`,
      [req.params.id]
    );
    const s = rows[0];
    res.json({
      id: s.id,
      value: s.value,
      unit: s.unit,
      tariffId: s.tariffId,
      typeId: s.typeId,
      type: { id: s.typeId, name: s.typeName }
    });
  } catch (e: any) {
    if (isMysqlDup(e)) {
      return res.status(409).json({ message: "Cannot move: target tariff already has this service type" });
    }
    throw e;
  }
});

/** fallback */
app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
