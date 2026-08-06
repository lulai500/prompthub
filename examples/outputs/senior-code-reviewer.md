Input code:

```js
app.post('/api/users', async (req, res) => {
  const { name, email, role } = req.body;
  const sql = `INSERT INTO users (name, email, role)
               VALUES ('${name}', '${email}', '${role}')`;
  await db.query(sql);
  res.send({ ok: true });
});
```

## Review findings

🔴 **Critical — SQL Injection**
`name` / `email` / `role` are concatenated straight into SQL. An attacker can inject via
`name = "x', 'a@a.com', 'admin'); --"`.
**Fix:**
```js
await db.query('INSERT INTO users (name, email, role) VALUES ($1, $2, $3)',
               [name, email, role]);
```

🟠 **Warning — No input validation**
`email` is not format-checked and `role` is not on a whitelist (should be `['user','editor','admin']`).
**Fix:** validate email with a regex and check `role` against an enum before inserting.

🟠 **Warning — No error handling**
If `await db.query` throws, the endpoint returns 500 with no connection cleanup.
**Fix:** wrap in try/catch and return a consistent error response.

🟡 **Suggestion — No idempotency guard**
Repeated clicks insert duplicate users. Add a UNIQUE constraint on `email` and catch error 23505.

✅ **Strengths:** short, clear intent, no unnecessary abstraction.

🎯 **Top 3 priorities:**
1. Parameterize the SQL (blocks injection)
2. Input validation + `role` whitelist
3. UNIQUE(email) + error handling
