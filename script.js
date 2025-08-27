document.addEventListener('DOMContentLoaded', () => {
    // Références aux éléments du DOM
    const expenseForm = document.getElementById('expense-form');
    const detailTableBody = document.getElementById('detail-table-body');
    const summaryTableBody = document.getElementById('summary-table-body');
    const employeeNameInput = document.getElementById('employee-name');
    const employeeDataList = document.getElementById('employee-list');
    const searchDetailInput = document.getElementById('search-detail');
    const searchSummaryInput = document.getElementById('search-summary');
    
    // Éléments pour la modification
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeModalButton = document.querySelector('.close-button');

    // Éléments pour les diagrammes
    const chartEmployeeSelect = document.getElementById('chart-employee-select');
    const chartCanvas = document.getElementById('expense-chart').getContext('2d');
    let expenseChart;

    // Charger les données ou initialiser un tableau vide
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

    const saveData = () => {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    };

    const render = () => {
        renderTables(searchDetailInput.value, searchSummaryInput.value);
        updateChart();
        updateEmployeeDropdowns();
    };

    const renderTables = (detailFilter = '', summaryFilter = '') => {
        detailTableBody.innerHTML = '';
        summaryTableBody.innerHTML = '';
        const employeeSummary = {};

        const filteredExpenses = expenses.filter(expense => 
            Object.values(expense).some(val => String(val).toLowerCase().includes(detailFilter.toLowerCase()))
        );

        filteredExpenses.forEach(expense => {
            const balance = expense.amountWithdrawn - expense.justification;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${expense.employeeName}</td>
                <td>${expense.workDate}</td>
                <td>${expense.destination}</td>
                <td>${expense.category}</td>
                <td>${expense.amountWithdrawn.toLocaleString('fr-FR')} FCFA</td>
                <td>${expense.justification.toLocaleString('fr-FR')} FCFA</td>
                <td style="color: ${balance > 0 ? 'var(--error-color)' : 'var(--success-color)'}; font-weight: bold;">
                    ${balance.toLocaleString('fr-FR')} FCFA
                </td>
                <td class="actions-cell">
                    <button class="btn-edit" data-id="${expense.id}">Modifier</button>
                    <button class="btn-delete" data-id="${expense.id}">Supprimer</button>
                </td>
            `;
            detailTableBody.appendChild(row);

            if (!employeeSummary[expense.employeeName]) {
                employeeSummary[expense.employeeName] = { totalWithdrawn: 0, totalJustified: 0 };
            }
            employeeSummary[expense.employeeName].totalWithdrawn += expense.amountWithdrawn;
            employeeSummary[expense.employeeName].totalJustified += expense.justification;
        });

        Object.keys(employeeSummary)
            .filter(name => name.toLowerCase().includes(summaryFilter.toLowerCase()))
            .sort()
            .forEach(name => {
                const summary = employeeSummary[name];
                const totalBalance = summary.totalWithdrawn - summary.totalJustified;
                const summaryRow = document.createElement('tr');
                summaryRow.innerHTML = `
                    <td>${name}</td>
                    <td>${summary.totalWithdrawn.toLocaleString('fr-FR')} FCFA</td>
                    <td>${summary.totalJustified.toLocaleString('fr-FR')} FCFA</td>
                    <td style="color: ${totalBalance > 0 ? 'var(--error-color)' : 'var(--success-color)'}; font-weight: bold;">
                        ${totalBalance.toLocaleString('fr-FR')} FCFA
                    </td>
                `;
                summaryTableBody.appendChild(summaryRow);
            });
    };

    const updateEmployeeDropdowns = () => {
        const employeeNames = [...new Set(expenses.map(e => e.employeeName))].sort();
        
        // Pour la suggestion dans le formulaire
        employeeDataList.innerHTML = '';
        employeeNames.forEach(name => {
            employeeDataList.innerHTML += `<option value="${name}">`;
        });

        // Pour le filtre du diagramme
        const currentSelection = chartEmployeeSelect.value;
        chartEmployeeSelect.innerHTML = '<option value="all">Synthèse Globale</option>';
        employeeNames.forEach(name => {
            chartEmployeeSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
        chartEmployeeSelect.value = currentSelection;
    };

    const updateChart = () => {
        if (expenseChart) {
            expenseChart.destroy();
        }

        const selectedEmployee = chartEmployeeSelect.value;
        let chartData;
        let chartTitle;

        if (selectedEmployee === 'all') {
            const summary = expenses.reduce((acc, curr) => {
                acc.withdrawn += curr.amountWithdrawn;
                acc.justified += curr.justification;
                return acc;
            }, { withdrawn: 0, justified: 0 });
            
            chartData = {
                labels: ['Total Retiré', 'Total Justifié', 'Solde Non Justifié'],
                datasets: [{
                    label: 'Montant en FCFA',
                    data: [summary.withdrawn, summary.justified, summary.withdrawn - summary.justified],
                    backgroundColor: ['#FFB366', '#4CAF50', '#F44336']
                }]
            };
            chartTitle = 'Synthèse Globale de Toutes les Dépenses';
        } else {
            const employeeExpenses = expenses.filter(e => e.employeeName === selectedEmployee);
            const summary = employeeExpenses.reduce((acc, curr) => {
                acc.withdrawn += curr.amountWithdrawn;
                acc.justified += curr.justification;
                return acc;
            }, { withdrawn: 0, justified: 0 });

            chartData = {
                labels: ['Total Retiré', 'Total Justifié', 'Solde Non Justifié'],
                datasets: [{
                    label: `Dépenses de ${selectedEmployee}`,
                    data: [summary.withdrawn, summary.justified, summary.withdrawn - summary.justified],
                    backgroundColor: ['#FFB366', '#4CAF50', '#F44336']
                }]
            };
            chartTitle = `Analyse des Dépenses pour ${selectedEmployee}`;
        }

        expenseChart = new Chart(chartCanvas, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: chartTitle, font: { size: 18 } },
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => `${value.toLocaleString('fr-FR')} FCFA` } }
                }
            }
        });
    };

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amountWithdrawn = parseFloat(document.getElementById('amount-withdrawn').value);
        const justification = parseFloat(document.getElementById('justification').value);

        if (justification > amountWithdrawn) {
            alert("Erreur : Le montant justifié ne peut pas être supérieur au montant retiré.");
            return;
        }

        const newExpense = {
            id: Date.now().toString(),
            employeeName: employeeNameInput.value.trim(),
            workDate: document.getElementById('work-date').value,
            destination: document.getElementById('destination').value.trim(),
            category: document.getElementById('category').value,
            amountWithdrawn: amountWithdrawn,
            justification: justification,
        };

        expenses.push(newExpense);
        saveData();
        render();
        expenseForm.reset();
        employeeNameInput.focus();
    });

    detailTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            if (confirm("Êtes-vous sûr de vouloir supprimer cet enregistrement ?")) {
                expenses = expenses.filter(expense => expense.id !== id);
                saveData();
                render();
            }
        }
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            const expenseToEdit = expenses.find(expense => expense.id === id);
            
            document.getElementById('edit-id').value = expenseToEdit.id;
            document.getElementById('edit-employee-name').value = expenseToEdit.employeeName;
            document.getElementById('edit-work-date').value = expenseToEdit.workDate;
            document.getElementById('edit-destination').value = expenseToEdit.destination;
            document.getElementById('edit-category').value = expenseToEdit.category;
            document.getElementById('edit-amount-withdrawn').value = expenseToEdit.amountWithdrawn;
            document.getElementById('edit-justification').value = expenseToEdit.justification;
            
            editModal.style.display = 'block';
        }
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const amountWithdrawn = parseFloat(document.getElementById('edit-amount-withdrawn').value);
        const justification = parseFloat(document.getElementById('edit-justification').value);

        if (justification > amountWithdrawn) {
            alert("Erreur : Le montant justifié ne peut pas être supérieur au montant retiré.");
            return;
        }

        const expenseIndex = expenses.findIndex(expense => expense.id === id);
        if (expenseIndex > -1) {
            expenses[expenseIndex] = {
                id: id,
                employeeName: document.getElementById('edit-employee-name').value.trim(),
                workDate: document.getElementById('edit-work-date').value,
                destination: document.getElementById('edit-destination').value.trim(),
                category: document.getElementById('edit-category').value,
                amountWithdrawn: amountWithdrawn,
                justification: justification
            };
        }
        
        saveData();
        render();
        editModal.style.display = 'none';
    });
    
    closeModalButton.onclick = () => editModal.style.display = 'none';
    window.onclick = (event) => { if (event.target == editModal) { editModal.style.display = 'none'; } };

    searchDetailInput.addEventListener('input', () => renderTables(searchDetailInput.value, searchSummaryInput.value));
    searchSummaryInput.addEventListener('input', () => renderTables(searchDetailInput.value, searchSummaryInput.value));
    chartEmployeeSelect.addEventListener('change', updateChart);

    // Initialisation
    render();
});

// Fonction d'export (inchangée)
function exportTableTo(format, type) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tableId = type === 'detail' ? 'detail-table' : 'summary-table';
    const table = document.getElementById(tableId);
    const title = type === 'detail' ? 'Rapport Detaille des Frais' : 'Synthese Globale par Employe';
    const fileName = `${title.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'pdf') {
        doc.text(title, 14, 15);
        doc.autoTable({ html: `#${tableId}`, startY: 20, theme: 'grid', styles: { font: 'Poppins', fontSize: 8 }, headStyles: { fillColor: [255, 121, 0] } });
        doc.save(`${fileName}.pdf`);
    } else if (format === 'word') {
        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Export Word</title></head>
            <body><h3>${title}</h3>${table.outerHTML}</body></html>`;
        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}