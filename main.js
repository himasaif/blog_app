// main.js
const express = require("express");
const mysql = require("mysql2");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- DB connection ---
const DB = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "blog_app",
});

DB.connect((err) => {
  if (err) {
    console.error("❌ Error in connection:", err.message);
  } else {
    console.log("✅ Database connected successfully");
  }
});

// --- Health check route ---
app.get("/", (req, res) => {
  res.send("✅ The routing is working fine!");
});

// --- Register (simple + email uniqueness check) ---
app.post("/register", (req, res) => {
  const { First_name, Email, Password } = req.body;

  if (!First_name || !Email || !Password) {
    return res
      .status(400)
      .json({ message: "First_name, Email, Password are required" });
  }

  const checkSql = "SELECT id FROM users WHERE Email = ? LIMIT 1";
  DB.execute(checkSql, [Email], (err, rows) => {
    if (err) {
      console.error("❌ DB error (check):", err.message);
      return res.status(500).json({ error: "DB error (check)" });
    }

    if (rows.length > 0) {
      return res.status(409).json({ message: "the user already exists" });
    }

    const insertSql =
      "INSERT INTO users (First_name, Email, Password) VALUES (?, ?, ?)";
    DB.execute(insertSql, [First_name, Email, Password], (err, result) => {
      if (err) {
        console.error("❌ DB error (insert):", err.message);
        return res.status(500).json({ message: "inserting error" });
      }
      return res
        .status(201)
        .json({ message: "user is registered", userID: result.insertId });
    });
  });
});

// --- Login (simple: fetch by email then plain-text compare) ---
app.post("/login", (req, res) => {
  const Email = req.body.Email ?? req.body.email;
  const Password = req.body.Password ?? req.body.password;

  if (!Email || !Password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and Password are required" });
  }

  const sql =
    "SELECT id, First_name, Email, Password FROM users WHERE Email = ? LIMIT 1";
  DB.execute(sql, [Email], (error, results) => {
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const user = results[0];
    const isMatch = String(user.Password) === String(Password); // temporary plain-text compare

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: { id: user.id, First_name: user.First_name, Email: user.Email },
    });
  });
});

// --- Get profile by user id ---
app.get("/profile/:userId", (req, res) => {
  const { userId } = req.params;
  const query = "SELECT First_name, Email FROM users WHERE id = ? LIMIT 1";
  DB.execute(query, [userId], (error, rows) => {
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    if (rows.length > 0) {
      return res.status(200).json({ success: true, data: rows[0] });
    }
    return res
      .status(404)
      .json({ success: false, message: "user is not found!" });
  });
});

// --- Update user (First_name only) ---
app.patch("/user/:userId", (req, res) => {
  const { userId } = req.params;
  const { First_name } = req.body;

  if (!First_name || !String(First_name).trim()) {
    return res
      .status(400)
      .json({ success: false, message: "First_name is required" });
  }

  const query = "UPDATE users SET First_name = ? WHERE id = ?";
  DB.execute(query, [First_name, userId], (error, results) => {
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (results.affectedRows > 0) {
      return res
        .status(200)
        .json({ success: true, message: "user update success" });
    }

    return res
      .status(404)
      .json({ success: false, message: "user is not found!" });
  });
});

// --- Delete user ---
app.delete("/user/:userId", (req, res) => {
  const { userId } = req.params;
  const query = "DELETE FROM users WHERE id = ?";
  DB.execute(query, [userId], (error, results) => {
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    if (results.affectedRows > 0) {
      return res
        .status(200)
        .json({ success: true, message: "user DELETE success" });
    }
    return res
      .status(404)
      .json({ success: false, message: "user is not found!" });
  });
});

// --- Search by First_name (GET: reads from query; body supported as fallback) ---
app.get("/search", (req, res) => {
  const First_name = req.query.First_name ?? req.body?.First_name;

  if (!First_name || !String(First_name).trim()) {
    return res
      .status(400)
      .json({ success: false, message: "First_name is required" });
  }

  const query = "SELECT First_name, Email FROM users WHERE First_name = ?";
  DB.execute(query, [First_name], (error, results) => {
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    if (results.length > 0) {
      return res.status(200).json({ success: true, data: results });
    }
    return res
      .status(404)
      .json({ success: false, message: "this user is not found" });
  });
});
///////////////////////////////*************** blog*********************** */////////////////////////////////////////

app.post("/blog", (req, res) => {
  const title = req.body.title ?? req.body.titel; // accept both, prefer "title"
  const { content, user_id } = req.body;

  if (title == null || content == null || user_id == null) {
    return res.status(400).json({
      success: false,
      message: "title, content, user_id are required",
    });
  }

  const checkUserSql = "SELECT 1 FROM users WHERE id = ? LIMIT 1";
  DB.execute(checkUserSql, [user_id], (error, rows) => {
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "user is not found" });
    }

    const insertSql =
      "INSERT INTO blog (title, content, user_id) VALUES (?, ?, ?)";
    DB.execute(insertSql, [title, content, user_id], (err2, insertResult) => {
      if (err2) {
        return res.status(500).json({ success: false, error: err2.message });
      }
      return res.status(201).json({
        success: true,
        message: "the blog is created",
        blogId: insertResult.insertId,
      });
    });
  });
});
app.patch("/blog/:blogId", (req, res) => {
  const blogId = Number(req.params.blogId);
  const { title, user_id } = req.body || {};

  if (!Number.isInteger(blogId) || blogId <= 0)
    return res.status(400).json({ success: false, message: "Invalid blogId" });
  if (typeof title !== "string" || !title.trim())
    return res
      .status(400)
      .json({ success: false, message: "title is required" });
  if (!Number.isInteger(Number(user_id)))
    return res.status(400).json({ success: false, message: "Invalid user_id" });

  // 1) تأكيد وجود المستخدم (لو جدول users عندك فيه user_id بدل id، بدّل الاستعلام للسطر المعلّق تحت)
  const userQuery = "SELECT id FROM users WHERE id = ?";
  // const userQuery = "SELECT user_id AS id FROM users WHERE user_id = ?"; // ← لو عمودك اسمه user_id
  const userValues = [user_id];

  DB.execute(userQuery, userValues, (error, results) => {
    if (error)
      return res.status(500).json({ success: false, message: error.message });

    if (results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 2) هل الـ blog موجود؟ (خد بالك: بنستخدم blog_id مش id)
    const blogQueryExist =
      "SELECT blog_id, user_id FROM blog WHERE blog_id = ?";
    const blogValuesExist = [blogId];

    DB.execute(blogQueryExist, blogValuesExist, (error, results) => {
      if (error)
        return res.status(500).json({ success: false, message: error.message });

      if (results.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Blog not found" });

      // 3) ملكية البوست
      if (Number(user_id) !== Number(results[0].user_id))
        return res
          .status(403)
          .json({ success: false, message: "Not allowed: not the owner" });

      // 4) التحديث على جدول blog باستخدام blog_id
      const blogUpdate =
        "UPDATE blog SET title = ? WHERE blog_id = ? AND user_id = ?";
      const blogValues = [title.trim(), blogId, user_id];

      DB.execute(blogUpdate, blogValues, (error, updateResult) => {
        if (error)
          return res
            .status(500)
            .json({ success: false, message: error.message });

        if (updateResult.affectedRows === 0)
          return res
            .status(403)
            .json({ success: false, message: "Not allowed or blog not found" });

        return res.status(200).json({
          success: true,
          message: "Blog updated",
          data: {
            blog_id: blogId,
            title: title.trim(),
            user_id: Number(user_id),
          },
        });
      });
    });
  });
});
app.delete("/blog/:blogId", (req, res) => {
  const blogId = Number(req.params.blogId);
  const { user_id } = req.body || {};

  // 1) تحققات مبدئية
  if (!Number.isInteger(blogId) || blogId <= 0)
    return res.status(400).json({ success: false, message: "Invalid blogId" });
  if (!Number.isInteger(Number(user_id)))
    return res.status(400).json({ success: false, message: "Invalid user_id" });

  // 2) تأكيد وجود المستخدم (بدّل للسطر المعلّق لو عندك العمود user_id بدل id)
  const userQuery = "SELECT id FROM users WHERE id = ?";
  // const userQuery = "SELECT user_id AS id FROM users WHERE user_id = ?"; // ← استخدم ده لو جدول users عندك عموده user_id
  DB.execute(userQuery, [user_id], (err, users) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (users.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 3) تأكيد وجود البوست
    DB.execute(
      "SELECT blog_id, user_id FROM blog WHERE blog_id = ?",
      [blogId],
      (err, blogs) => {
        if (err)
          return res.status(500).json({ success: false, message: err.message });
        if (blogs.length === 0)
          return res
            .status(404)
            .json({ success: false, message: "Blog not found" });

        // 4) تأكيد الملكية
        if (Number(blogs[0].user_id) !== Number(user_id))
          return res
            .status(403)
            .json({ success: false, message: "Not allowed: not the owner" });

        // 5) الحذف
        DB.execute(
          "DELETE FROM blog WHERE blog_id = ? AND user_id = ?",
          [blogId, user_id],
          (err, result) => {
            if (err)
              return res
                .status(500)
                .json({ success: false, message: err.message });

            if (result.affectedRows === 0)
              return res
                .status(404)
                .json({ success: false, message: "Blog not found" });

            return res.status(200).json({
              success: true,
              message: "Blog deleted",
              data: { blog_id: blogId, user_id: Number(user_id) },
            });
          }
        );
      }
    );
  });
});

app.get("/blog/:blogId", (req, res) => {
  const blogId = Number(req.params.blogId);
  if (!Number.isInteger(blogId) || blogId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid blogId" });
  }

  DB.execute("SELECT * FROM blog WHERE blog_id = ?", [blogId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }
    return res.status(200).json({ success: true, data: rows[0] });
  });
});
app.get("/blogs", (req, res) => {
  // 1) إعداد الباراميترات
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = (page - 1) * limit;
  const filters = [];
  const params = [];
  if (req.query.user_id !== undefined) {
    const qUserId = Number(req.query.user_id);
    if (!Number.isInteger(qUserId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user_id" });
    }
    filters.push("user_id = ?");
    params.push(qUserId);
  }
  const search = (req.query.search || "").trim();
  if (search) {
    filters.push("title LIKE ?");
    params.push(`%${search}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const orderBy = "ORDER BY blog_id DESC"; // ممكن تغيّره لـ created_at لو عندك العمود
  const countSql = `SELECT COUNT(*) AS total FROM blog ${where}`;
  const listSql = `SELECT * FROM blog ${where} ${orderBy} LIMIT ? OFFSET ?`;
  DB.execute(countSql, params, (e1, countRows) => {
    if (e1) {
      return res.status(500).json({ success: false, message: e1.message });
    }
    const total = countRows[0]?.total ?? 0;
    DB.execute(listSql, [...params, limit, offset], (e2, rows) => {
      if (e2) {
        return res.status(500).json({ success: false, message: e2.message });
      }
      return res.status(200).json({
        success: true,
        data: rows,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 0,
        },
      });
    });
  });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// --- Server error handler ---
app.on("error", (err) => {
  console.error("❌ Error in server:", err.message);
});
