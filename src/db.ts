import * as SQLite from 'expo-sqlite';

export type Account = {
  id: number;
  name: string;
  description: string | null;
  beginningBalance: number;
};

export type Category = {
  id: number;
  parentCategoryId: number | null;
  name: string;
  nature: string;
  color: string;
};

export type RecordRow = {
  id: number;
  label: string;
  amount: number;
  date: string;
  accountId: number;
  categoryId: number | null;
  categoryName: string | null;
  isIncome: number;
  isTransfer: number;
};

export type Person = {
  id: number;
  name: string;
};

export type Split = {
  id: number;
  recordId: number;
  amount: number;
  personId: number;
  personName: string;
  isPaid: number;
  paidDate: string | null;
  accountId: number | null;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS account (
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME,
  id INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  description VARCHAR,
  "beginningBalance" FLOAT NOT NULL,
  "repaymentDate" INTEGER,
  hidden BOOLEAN NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS ix_account_id ON account (id);

CREATE TABLE IF NOT EXISTS category (
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME,
  id INTEGER NOT NULL,
  "parentCategoryId" INTEGER,
  name VARCHAR NOT NULL,
  nature VARCHAR(4) NOT NULL,
  color VARCHAR NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY("parentCategoryId") REFERENCES category (id)
);
CREATE INDEX IF NOT EXISTS ix_category_id ON category (id);

CREATE TABLE IF NOT EXISTS person (
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME,
  id INTEGER NOT NULL,
  name VARCHAR,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS ix_person_id ON person (id);

CREATE TABLE IF NOT EXISTS record (
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  id INTEGER NOT NULL,
  label VARCHAR NOT NULL,
  amount FLOAT NOT NULL CHECK (amount > 0),
  date DATETIME NOT NULL,
  "accountId" INTEGER NOT NULL,
  "categoryId" INTEGER,
  tags VARCHAR,
  "isInProgress" BOOLEAN NOT NULL,
  "isIncome" BOOLEAN NOT NULL,
  "isTransfer" BOOLEAN NOT NULL CHECK ((isTransfer = FALSE) OR (isIncome = FALSE)),
  "transferToAccountId" INTEGER,
  PRIMARY KEY (id),
  FOREIGN KEY("accountId") REFERENCES account (id),
  FOREIGN KEY("categoryId") REFERENCES category (id),
  FOREIGN KEY("transferToAccountId") REFERENCES account (id)
);
CREATE INDEX IF NOT EXISTS ix_record_id ON record (id);

CREATE TABLE IF NOT EXISTS record_line (
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  id INTEGER NOT NULL,
  "recordId" INTEGER NOT NULL,
  description VARCHAR,
  amount FLOAT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY("recordId") REFERENCES record (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_record_line_record_id ON record_line ("recordId");

CREATE TABLE IF NOT EXISTS record_template (
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  id INTEGER NOT NULL,
  label VARCHAR NOT NULL,
  amount FLOAT NOT NULL CHECK (amount > 0),
  "accountId" INTEGER NOT NULL,
  "categoryId" INTEGER,
  "order" INTEGER NOT NULL,
  "isIncome" BOOLEAN NOT NULL,
  "isTransfer" BOOLEAN NOT NULL CHECK ((isTransfer = FALSE) OR (isIncome = FALSE)),
  "transferToAccountId" INTEGER,
  PRIMARY KEY (id),
  FOREIGN KEY("accountId") REFERENCES account (id),
  FOREIGN KEY("categoryId") REFERENCES category (id),
  UNIQUE ("order"),
  FOREIGN KEY("transferToAccountId") REFERENCES account (id)
);
CREATE INDEX IF NOT EXISTS ix_record_template_id ON record_template (id);

CREATE TABLE IF NOT EXISTS split (
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  id INTEGER NOT NULL,
  "recordId" INTEGER NOT NULL,
  amount FLOAT NOT NULL,
  "personId" INTEGER NOT NULL,
  "isPaid" BOOLEAN NOT NULL,
  "paidDate" DATETIME,
  "accountId" INTEGER,
  PRIMARY KEY (id),
  FOREIGN KEY("recordId") REFERENCES record (id) ON DELETE CASCADE,
  FOREIGN KEY("personId") REFERENCES person (id),
  FOREIGN KEY("accountId") REFERENCES account (id)
);
CREATE INDEX IF NOT EXISTS ix_split_id ON split (id);

CREATE TABLE IF NOT EXISTS app_setting (
  key VARCHAR NOT NULL PRIMARY KEY,
  value VARCHAR
);
`;

const DEFAULT_CATEGORIES: {
  name: string;
  color: string;
  nature: string;
  subcategories?: { name: string; nature: string }[];
}[] = [
  {
    name: 'Alimentación',
    color: '#FF6B6B',
    nature: 'NEED',
    subcategories: [
      { name: 'Supermercado', nature: 'MUST' },
      { name: 'Restaurantes', nature: 'NEED' },
      { name: 'Delivery', nature: 'WANT' },
      { name: 'Snacks', nature: 'WANT' },
    ],
  },
  {
    name: 'Transporte',
    color: '#9CA3AF',
    nature: 'MUST',
    subcategories: [
      { name: 'Transporte público', nature: 'MUST' },
      { name: 'Taxi', nature: 'NEED' },
      { name: 'Aplicaciones', nature: 'NEED' },
    ],
  },
  {
    name: 'Compras',
    color: '#22D3EE',
    nature: 'WANT',
    subcategories: [
      { name: 'Ropa', nature: 'NEED' },
      { name: 'Electrónica', nature: 'NEED' },
      { name: 'Hogar', nature: 'WANT' },
      { name: 'Regalos', nature: 'WANT' },
    ],
  },
  {
    name: 'Comunicación',
    color: '#60A5FA',
    nature: 'NEED',
    subcategories: [
      { name: 'Teléfono', nature: 'MUST' },
      { name: 'Internet', nature: 'MUST' },
      { name: 'Streaming', nature: 'WANT' },
      { name: 'Software', nature: 'NEED' },
    ],
  },
  {
    name: 'Vehículo',
    color: '#F472B6',
    nature: 'WANT',
    subcategories: [
      { name: 'Combustible', nature: 'NEED' },
      { name: 'Mantenimiento', nature: 'NEED' },
      { name: 'Seguro', nature: 'NEED' },
      { name: 'Estacionamiento', nature: 'NEED' },
    ],
  },
  {
    name: 'Entretenimiento',
    color: '#4ADE80',
    nature: 'WANT',
    subcategories: [
      { name: 'Cine', nature: 'WANT' },
      { name: 'Deportes', nature: 'WANT' },
      { name: 'Hobbies', nature: 'WANT' },
      { name: 'Viajes', nature: 'WANT' },
    ],
  },
  {
    name: 'Gastos financieros',
    color: '#EF4444',
    nature: 'NEED',
    subcategories: [
      { name: 'Comisiones bancarias', nature: 'MUST' },
      { name: 'Intereses', nature: 'MUST' },
      { name: 'Inversiones', nature: 'NEED' },
      { name: 'Impuestos', nature: 'MUST' },
    ],
  },
  {
    name: 'Ingresos',
    color: '#FACC15',
    nature: 'MUST',
    subcategories: [
      { name: 'Salario', nature: 'MUST' },
      { name: 'Bono', nature: 'MUST' },
      { name: 'Inversiones', nature: 'MUST' },
      { name: 'Ingresos extra', nature: 'MUST' },
    ],
  },
  {
    name: 'Salud',
    color: '#F87171',
    nature: 'MUST',
    subcategories: [
      { name: 'Médico', nature: 'MUST' },
      { name: 'Medicamentos', nature: 'MUST' },
      { name: 'Seguro', nature: 'MUST' },
      { name: 'Dental', nature: 'MUST' },
    ],
  },
  {
    name: 'Educación',
    color: '#818CF8',
    nature: 'NEED',
    subcategories: [
      { name: 'Colegiatura', nature: 'MUST' },
      { name: 'Libros', nature: 'NEED' },
      { name: 'Cursos', nature: 'WANT' },
      { name: 'Capacitación', nature: 'WANT' },
    ],
  },
  {
    name: 'Vivienda',
    color: '#C084FC',
    nature: 'MUST',
    subcategories: [
      { name: 'Arriendo', nature: 'MUST' },
      { name: 'Hipoteca', nature: 'MUST' },
      { name: 'Servicios', nature: 'MUST' },
      { name: 'Muebles', nature: 'NEED' },
    ],
  },
];

async function seedCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM category WHERE "deletedAt" IS NULL'
  );
  if (count && count.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  for (const cat of DEFAULT_CATEGORIES) {
    const result = await db.runAsync(
      `INSERT INTO category ("createdAt", "updatedAt", id, "parentCategoryId", name, nature, color)
       VALUES (?, ?, NULL, NULL, ?, ?, ?)`,
      now,
      now,
      cat.name,
      cat.nature,
      cat.color
    );
    const parentId = result.lastInsertRowId as number;

    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        await db.runAsync(
          `INSERT INTO category ("createdAt", "updatedAt", id, "parentCategoryId", name, nature, color)
           VALUES (?, ?, NULL, ?, ?, ?, ?)`,
          now,
          now,
          parentId,
          sub.name,
          sub.nature,
          cat.color
        );
      }
    }
  }
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA);
  await seedCategories(db);

  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM account WHERE name = ?',
    'Cuenta Corriente'
  );
  if (!existing || existing.count === 0) {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO account ("createdAt", "updatedAt", id, name, description, "beginningBalance", hidden)
       VALUES (?, ?, NULL, ?, ?, 0, 0)`,
      now,
      now,
      'Cuenta Corriente',
      'Cuenta principal'
    );
  }

  const active = await getActiveAccountId(db);
  if (active === null) {
    const first = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM account WHERE "deletedAt" IS NULL ORDER BY id LIMIT 1'
    );
    if (first) {
      await setActiveAccountId(db, first.id);
    }
  }
}

export async function getAllAccounts(db: SQLite.SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>(
    'SELECT id, name, description, "beginningBalance" FROM account WHERE "deletedAt" IS NULL ORDER BY id'
  );
}

export async function getAccountById(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<Account | null> {
  return db.getFirstAsync<Account>(
    'SELECT id, name, description, "beginningBalance" FROM account WHERE id = ? AND "deletedAt" IS NULL',
    id
  );
}

export async function createAccount(
  db: SQLite.SQLiteDatabase,
  name: string,
  description: string | null
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO account ("createdAt", "updatedAt", id, name, description, "beginningBalance", hidden)
     VALUES (?, ?, NULL, ?, ?, 0, 0)`,
    now,
    now,
    name,
    description ?? null
  );
  return result.lastInsertRowId as number;
}

export async function getActiveAccountId(
  db: SQLite.SQLiteDatabase
): Promise<number | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_setting WHERE key = ?',
    'activeAccountId'
  );
  return row ? Number(row.value) : null;
}

export async function setActiveAccountId(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO app_setting (key, value) VALUES (?, ?)',
    'activeAccountId',
    String(id)
  );
}

export async function getAllCategories(
  db: SQLite.SQLiteDatabase
): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT id, "parentCategoryId", name, nature, color FROM category WHERE "deletedAt" IS NULL ORDER BY "parentCategoryId" IS NOT NULL, id'
  );
}

export async function getCategoryById(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<Category | null> {
  return db.getFirstAsync<Category>(
    'SELECT id, "parentCategoryId", name, nature, color FROM category WHERE id = ? AND "deletedAt" IS NULL',
    id
  );
}

export async function saveRecord(
  db: SQLite.SQLiteDatabase,
  accountId: number,
  label: string,
  amount: number,
  isIncome: boolean,
  categoryId: number | null
): Promise<number> {
  const now = new Date().toISOString();
  const recordResult = await db.runAsync(
    `INSERT INTO record ("createdAt", "updatedAt", id, label, amount, date, "accountId", "categoryId", tags, "isInProgress", "isIncome", "isTransfer")
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, 0, ?, 0)`,
    now,
    now,
    label,
    amount,
    now,
    accountId,
    categoryId,
    isIncome ? 1 : 0
  );
  return recordResult.lastInsertRowId as number;
}

export async function getRecordsByAccount(
  db: SQLite.SQLiteDatabase,
  accountId: number
): Promise<RecordRow[]> {
  return db.getAllAsync<RecordRow>(
    `SELECT r.id, r.label, r.amount, r.date, r."accountId", r."categoryId", c.name AS categoryName, r."isIncome", r."isTransfer"
     FROM record r
     LEFT JOIN category c ON c.id = r."categoryId"
     WHERE r."accountId" = ?
     ORDER BY r.date DESC`,
    accountId
  );
}

export async function getAccountByName(
  db: SQLite.SQLiteDatabase,
  name: string
): Promise<Account | null> {
  return db.getFirstAsync<Account>(
    `SELECT id, name, description, "beginningBalance" FROM account WHERE name = ? AND "deletedAt" IS NULL`,
    name
  );
}

export async function getRecordById(
  db: SQLite.SQLiteDatabase,
  accountId: number,
  id: number
): Promise<RecordRow | null> {
  return db.getFirstAsync<RecordRow>(
    `SELECT r.id, r.label, r.amount, r.date, r."accountId", r."categoryId", c.name AS categoryName, r."isIncome", r."isTransfer"
     FROM record r
     LEFT JOIN category c ON c.id = r."categoryId"
     WHERE r.id = ? AND r."accountId" = ?`,
    id,
    accountId
  );
}

export async function updateRecord(
  db: SQLite.SQLiteDatabase,
  id: number,
  updates: { label?: string; amount?: number; isIncome?: boolean; categoryId?: number | null }
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.label !== undefined) {
    fields.push('label = ?');
    values.push(updates.label);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.isIncome !== undefined) {
    fields.push('"isIncome" = ?');
    values.push(updates.isIncome ? 1 : 0);
  }
  if (updates.categoryId !== undefined) {
    fields.push('"categoryId" = ?');
    values.push(updates.categoryId);
  }

  if (fields.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  fields.push('"updatedAt" = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE record SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

export async function deleteRecord(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync('DELETE FROM record WHERE id = ?', id);
}

export async function getAccountBalance(
  db: SQLite.SQLiteDatabase,
  accountId: number
): Promise<number> {
  const rows = await db.getAllAsync<{ isIncome: number; amount: number }>(
    'SELECT "isIncome", amount FROM record WHERE "accountId" = ?',
    accountId
  );
  return rows.reduce((sum, row) => sum + (row.isIncome ? row.amount : -row.amount), 0);
}

export async function getAllPeople(db: SQLite.SQLiteDatabase): Promise<Person[]> {
  return db.getAllAsync<Person>(
    'SELECT id, name FROM person WHERE "deletedAt" IS NULL ORDER BY name COLLATE NOCASE'
  );
}

export async function createPerson(
  db: SQLite.SQLiteDatabase,
  name: string
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO person ("createdAt", "updatedAt", id, name)
     VALUES (?, ?, NULL, ?)`,
    now,
    now,
    name
  );
  return result.lastInsertRowId as number;
}

export async function updatePerson(
  db: SQLite.SQLiteDatabase,
  id: number,
  name: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE person SET name = ?, "updatedAt" = ? WHERE id = ?',
    name,
    now,
    id
  );
}

export async function deletePerson(
  db: SQLite.SQLiteDatabase,
  id: number
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE person SET "deletedAt" = ? WHERE id = ?',
    now,
    id
  );
}

export async function saveSplits(
  db: SQLite.SQLiteDatabase,
  recordId: number,
  splits: { personId: number; amount: number }[]
): Promise<void> {
  await db.runAsync('DELETE FROM split WHERE "recordId" = ?', recordId);
  const now = new Date().toISOString();
  for (const s of splits) {
    await db.runAsync(
      `INSERT INTO split ("createdAt", "updatedAt", id, "recordId", amount, "personId", "isPaid", "paidDate", "accountId")
       VALUES (?, ?, NULL, ?, ?, ?, 0, NULL, NULL)`,
      now,
      now,
      recordId,
      s.amount,
      s.personId
    );
  }
}

export async function getSplitsByRecord(
  db: SQLite.SQLiteDatabase,
  recordId: number
): Promise<Split[]> {
  return db.getAllAsync<Split>(
    `SELECT s.id, s."recordId", s.amount, s."personId", p.name AS personName, s."isPaid", s."paidDate", s."accountId"
     FROM split s
     JOIN person p ON p.id = s."personId"
     WHERE s."recordId" = ?
     ORDER BY s.id`,
    recordId
  );
}

export async function setSplitPaid(
  db: SQLite.SQLiteDatabase,
  splitId: number,
  isPaid: boolean
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE split SET "isPaid" = ?, "paidDate" = ?, "updatedAt" = ? WHERE id = ?',
    isPaid ? 1 : 0,
    isPaid ? now : null,
    now,
    splitId
  );
}
