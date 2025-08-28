// =========================
// server.js
// =========================
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// Middlewares
// =========================
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // sert tes fichiers (HTML/JS/CSS)

// =========================
// Connexion MySQL
// =========================
const db = mysql.createConnection({
    host: "localhost",
    user: "root",       // adapte si ton user MySQL est différent
    password: "",       // adapte si ton MySQL a un mot de passe
    database: "gestion_frais"   // assure-toi d’avoir créé cette base
});

db.connect((err) => {
    if (err) {
        console.error("Erreur connexion MySQL:", err);
        process.exit(1);
    }
    console.log("✅ Connecté à MySQL");
});

// =========================
// API Routes
// =========================

// GET toutes les dépenses
app.get("/api/expenses", (req, res) => {
    db.query("SELECT * FROM expenses", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// POST ajouter une dépense
app.post("/api/expenses", (req, res) => {
    const { employeeName, workDate, destination, category, amountWithdrawn, justification } = req.body;
    const sql = "INSERT INTO expenses (employeeName, workDate, destination, category, amountWithdrawn, justification) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [employeeName, workDate, destination, category, amountWithdrawn, justification], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id: result.insertId, ...req.body });
    });
});

// PUT modifier une dépense
app.put("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    const { employeeName, workDate, destination, category, amountWithdrawn, justification } = req.body;
    const sql = "UPDATE expenses SET employeeName=?, workDate=?, destination=?, category=?, amountWithdrawn=?, justification=? WHERE id=?";
    db.query(sql, [employeeName, workDate, destination, category, amountWithdrawn, justification, id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ id, ...req.body });
    });
});

// DELETE supprimer une dépense
app.delete("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM expenses WHERE id=?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
    });
});

// =========================
// Lancer le serveur
// =========================
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});