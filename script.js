// ✅ script.js

let expenses = [];
let chart = null;

// Charger les dépenses depuis la BD
async function fetchExpenses() {
    try {
        const res = await fetch("/api/expenses");
        expenses = await res.json();
        renderTables();
        renderChart();
        populateEmployeeSelect();
    } catch (err) {
        console.error("Erreur lors du chargement des dépenses :", err);
    }
}

// Ajouter une dépense
document.getElementById("expense-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const newExpense = {
        employeeName: document.getElementById("employee-name").value,
        workDate: document.getElementById("work-date").value,
        destination: document.getElementById("destination").value,
        category: document.getElementById("category").value,
        amountWithdrawn: parseFloat(document.getElementById("amount-withdrawn").value),
        justification: parseFloat(document.getElementById("justification").value)
    };

    try {
        const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newExpense)
        });

        if (res.ok) {
            fetchExpenses(); // rafraîchir après ajout
            document.getElementById("expense-form").reset();
        } else {
            alert("Erreur lors de l'enregistrement");
        }
    } catch (err) {
        console.error("Erreur envoi :", err);
    }
});

// Afficher les tableaux
function renderTables() {
    const detailBody = document.getElementById("detail-table-body");
    const summaryBody = document.getElementById("summary-table-body");
    detailBody.innerHTML = "";
    summaryBody.innerHTML = "";

    const summary = {};

    expenses.forEach(exp => {
        const solde = exp.amountWithdrawn - exp.justification;

        // ✅ tableau détaillé
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${exp.employeeName}</td>
            <td>${exp.workDate}</td>
            <td>${exp.destination}</td>
            <td>${exp.category}</td>
            <td>${exp.amountWithdrawn}</td>
            <td>${exp.justification}</td>
            <td>${solde}</td>
            <td>
                <button onclick="editExpense(${exp.id})">✏️</button>
                <button onclick="deleteExpense(${exp.id})">🗑️</button>
            </td>
        `;
        detailBody.appendChild(tr);

        // ✅ calcul pour résumé global
        if (!summary[exp.employeeName]) {
            summary[exp.employeeName] = { withdrawn: 0, justified: 0 };
        }
        summary[exp.employeeName].withdrawn += exp.amountWithdrawn;
        summary[exp.employeeName].justified += exp.justification;
    });

    // ✅ remplir tableau résumé
    for (const [name, data] of Object.entries(summary)) {
        const solde = data.withdrawn - data.justified;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${name}</td>
            <td>${data.withdrawn}</td>
            <td>${data.justified}</td>
            <td>${solde}</td>
        `;
        summaryBody.appendChild(tr);
    }
}

// Peupler la liste des employés pour le graphique
function populateEmployeeSelect() {
    const select = document.getElementById("chart-employee-select");
    const employees = [...new Set(expenses.map(e => e.employeeName))];
    select.innerHTML = `<option value="all">Tous les employés</option>`;
    employees.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

// Générer le graphique
function renderChart() {
    const ctx = document.getElementById("expense-chart").getContext("2d");
    if (chart) chart.destroy();

    const selectedEmployee = document.getElementById("chart-employee-select").value;
    const chartType = document.getElementById("chart-type").value;

    let filtered = expenses;
    if (selectedEmployee !== "all") {
        filtered = expenses.filter(e => e.employeeName === selectedEmployee);
    }

    const categories = [...new Set(filtered.map(e => e.category))];
    const totals = categories.map(cat =>
        filtered.filter(e => e.category === cat)
                .reduce((sum, e) => sum + e.amountWithdrawn, 0)
    );

    chart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: categories,
            datasets: [{
                label: "Montant Retiré (FCFA)",
                data: totals,
                backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#9966FF"]
            }]
        },
        options: { responsive: true }
    });
}

// Supprimer une dépense
async function deleteExpense(id) {
    if (confirm("Supprimer cet enregistrement ?")) {
        await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        fetchExpenses();
    }
}

// Modifier une dépense (ouvre le modal)
function editExpense(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    document.getElementById("edit-id").value = exp.id;
    document.getElementById("edit-employee-name").value = exp.employeeName;
    document.getElementById("edit-work-date").value = exp.workDate;
    document.getElementById("edit-destination").value = exp.destination;
    document.getElementById("edit-category").value = exp.category;
    document.getElementById("edit-amount-withdrawn").value = exp.amountWithdrawn;
    document.getElementById("edit-justification").value = exp.justification;

    document.getElementById("edit-modal").style.display = "block";
}

// Sauvegarder modification
document.getElementById("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("edit-id").value;
    const updatedExpense = {
        employeeName: document.getElementById("edit-employee-name").value,
        workDate: document.getElementById("edit-work-date").value,
        destination: document.getElementById("edit-destination").value,
        category: document.getElementById("edit-category").value,
        amountWithdrawn: parseFloat(document.getElementById("edit-amount-withdrawn").value),
        justification: parseFloat(document.getElementById("edit-justification").value)
    };

    await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedExpense)
    });

    document.getElementById("edit-modal").style.display = "none";
    fetchExpenses();
});

// Fermer le modal
document.querySelector(".close-button").addEventListener("click", () => {
    document.getElementById("edit-modal").style.display = "none";
});

// Rafraîchir graphique quand on change de type ou d’employé
document.getElementById("chart-type").addEventListener("change", renderChart);
document.getElementById("chart-employee-select").addEventListener("change", renderChart);

// Charger les données au démarrage
fetchExpenses();