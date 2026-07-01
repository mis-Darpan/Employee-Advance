// =============================================
// LITPAX OWNER DASHBOARD — owner.js
// =============================================

const GAS_URL = CONFIG.GAS_URL;

let currentRequestId = null;
let activeAdvances   = [];
let allRequests      = [];

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  loadAll();
});

async function loadAll() {
  const selectedEmp = document.getElementById("recoveryEmpSelect")?.value || "";
  await Promise.all([
    loadDashboard(),
    loadPendingRequests(),
    loadActiveAdvances(),
    loadBalance(),
    loadAllRequests()
  ]);
  // Restore selected employee after reload
  if (selectedEmp) {
    document.getElementById("recoveryEmpSelect").value = selectedEmp;
    onEmpSelected();
  }
}

// =============================================
// TAB SWITCHING
// =============================================
const TAB_TITLES = {
  dashboard: "Dashboard",
  pending:   "Pending Requests",
  recovery:  "Recovery Entry",
  balance:   "Balance Overview",
  history:   "All Requests"
};

function showTab(name) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.querySelectorAll(".nav-item")[
    ["dashboard","pending","recovery","balance","history"].indexOf(name)
  ].classList.add("active");
  document.getElementById("pageTitle").textContent = TAB_TITLES[name];
}

// =============================================
// DASHBOARD
// =============================================
async function loadDashboard() {
  try {
    const res  = await fetch(GAS_URL + "?action=getBalance");
    const data = await res.json();
    if (!data.success) return;

    const rows = data.data;
    let totalGiven     = 0;
    let totalRecovered = 0;
    let totalPending   = 0;

    rows.forEach(r => {
      totalGiven     += parseFloat(r.totalTaken)     || 0;
      totalRecovered += parseFloat(r.totalRecovered) || 0;
      totalPending   += parseFloat(r.balanceDue)     || 0;
    });

    document.getElementById("dashTotalGiven").textContent     = "₹" + fmtNum(totalGiven);
    document.getElementById("dashTotalRecovered").textContent = "₹" + fmtNum(totalRecovered);
    document.getElementById("dashTotalPending").textContent   = "₹" + fmtNum(totalPending);
  } catch (err) {}
}

// =============================================
// PENDING REQUESTS
// =============================================
async function loadPendingRequests() {
  try {
    const res  = await fetch(GAS_URL + "?action=getAllRequests");
    const data = await res.json();
    if (!data.success) return;

    allRequests = data.data;
    const pending = allRequests.filter(r => r["Status"] === "Pending");

    const badge = document.getElementById("pendingBadge");
    if (pending.length > 0) {
      badge.textContent = pending.length;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }

    const container = document.getElementById("pendingList");
    if (pending.length === 0) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">✅</span>No pending requests.</div>`;
      return;
    }

    container.innerHTML = pending.map(r => `
      <div class="request-card">
        <div class="req-left">
          <div class="req-id">${r["Request ID"]}</div>
          <div class="req-name">${r["Employee Name"]} <span style="font-size:12px;color:var(--muted)">(${r["Employee ID"]})</span></div>
          <div class="req-meta">🏢 ${r["Department"]} &nbsp;|&nbsp; 🔄 ${r["Repayment Type"]} &nbsp;|&nbsp; 🕐 ${formatDate(r["Timestamp"])}</div>
          <div class="req-reason">📝 ${r["Reason"]}</div>
        </div>
        <div class="req-right">
          <div class="req-amount">₹${fmtNum(r["Amount Requested"])}</div>
          <div class="req-repay">Requested</div>
          <button class="approve-btn" onclick="openApproveModal('${r["Request ID"]}', '${r["Employee Name"]}', '${r["Employee ID"]}', '${r["Department"]}', ${r["Amount Requested"]}, '${r["Reason"]}', '${r["Repayment Type"]}')">
            Review →
          </button>
        </div>
      </div>
    `).join("");

  } catch (err) {
    document.getElementById("pendingList").innerHTML = `<div class="loading-msg">Error loading data.</div>`;
  }
}

// =============================================
// APPROVE MODAL
// =============================================
function openApproveModal(reqId, name, empId, dept, amount, reason, repayType) {
  currentRequestId = reqId;
  document.getElementById("approveModal").classList.remove("hidden");
  document.getElementById("approvedAmount").value = amount;
  document.getElementById("approveRemarks").value = "";

  document.getElementById("modalInfo").innerHTML = `
    <div class="info-item"><div class="info-label">Request ID</div><div class="info-val">${reqId}</div></div>
    <div class="info-item"><div class="info-label">Employee</div><div class="info-val">${name} (${empId})</div></div>
    <div class="info-item"><div class="info-label">Department</div><div class="info-val">${dept}</div></div>
    <div class="info-item"><div class="info-label">Repayment</div><div class="info-val">${repayType}</div></div>
    <div class="info-item" style="grid-column:span 2">
      <div class="info-label">Amount Requested</div>
      <div class="info-val big">₹${fmtNum(amount)}</div>
    </div>
    <div class="info-item" style="grid-column:span 2">
      <div class="info-label">Reason</div>
      <div class="info-val">${reason}</div>
    </div>
  `;
}

function closeModal() {
  document.getElementById("approveModal").classList.add("hidden");
  currentRequestId = null;
}

async function approveRequest() {
  const amount  = parseFloat(document.getElementById("approvedAmount").value);
  const remarks = document.getElementById("approveRemarks").value.trim();

  if (!amount || amount <= 0) { showToast("Enter amount to approve.", "error"); return; }

  const btn = document.querySelector(".btn-primary[onclick='approveRequest()']");
  if (btn) { btn.disabled = true; btn.textContent = "Processing..."; }

  try {
    const res  = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "approveRequest",
        requestId: currentRequestId,
        approvedAmount: amount,
        remarks
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`✅ ${data.status}! ₹${fmtNum(amount)} approved.`, "success");
      closeModal();
      loadAll();
    } else {
      showToast("Error: " + data.error, "error");
    }
  } catch (err) {
    showToast("Server error. Try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✅ Approve"; }
  }
}

async function rejectRequest() {
  const remarks = document.getElementById("approveRemarks").value.trim();
  if (!confirm("Reject this request?")) return;

  const btn = document.querySelector(".btn-danger[onclick='rejectRequest()']");
  if (btn) { btn.disabled = true; btn.textContent = "Processing..."; }

  try {
    const res  = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "rejectRequest",
        requestId: currentRequestId,
        remarks
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast("❌ Request rejected.", "error");
      closeModal();
      loadAll();
    }
  } catch (err) {
    showToast("Server error. Try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "❌ Reject"; }
  }
}

// =============================================
// RECOVERY
// =============================================
async function loadActiveAdvances() {
  try {
    const res  = await fetch(GAS_URL + "?action=getActiveAdvances");
    const data = await res.json();
    if (!data.success) return;

    activeAdvances = data.data;
    const select = document.getElementById("recoveryEmpSelect");
    select.innerHTML = `<option value="">-- Select Employee --</option>`;
    activeAdvances.forEach(emp => {
      select.innerHTML += `<option value="${emp.empId}">${emp.empName} — ₹${fmtNum(emp.balanceDue)} pending</option>`;
    });

    if (activeAdvances.length === 0) {
      select.innerHTML = `<option value="">✅ No pending balance</option>`;
    }
  } catch (err) {}
}

function onEmpSelected() {
  const empId   = document.getElementById("recoveryEmpSelect").value;
  const infoBox = document.getElementById("empBalanceInfo");
  const form    = document.getElementById("recoveryForm");

  if (!empId) {
    infoBox.classList.add("hidden");
    form.classList.add("hidden");
    return;
  }

  const emp = activeAdvances.find(e => String(e.empId).trim() === String(empId).trim());
  if (!emp) return;

  document.getElementById("balTaken").textContent     = "₹" + fmtNum(emp.totalTaken);
  document.getElementById("balRecovered").textContent = "₹" + fmtNum(emp.totalRecovered);
  document.getElementById("balDue").textContent       = "₹" + fmtNum(emp.balanceDue);

  document.getElementById("recoveryAmount").value = "";
  document.getElementById("recoveryRemarks").value = "";
  document.querySelectorAll('input[name="payType"]').forEach(r => r.checked = false);

  infoBox.classList.remove("hidden");
  form.classList.remove("hidden");
}

async function submitRecovery() {
  const empId   = document.getElementById("recoveryEmpSelect").value;
  const amount  = parseFloat(document.getElementById("recoveryAmount").value);
  const payType = document.querySelector('input[name="payType"]:checked');
  const remarks = document.getElementById("recoveryRemarks").value.trim();

  if (!empId)              { showToast("Please select an employee.", "error"); return; }
  if (!amount || amount <= 0) { showToast("Please enter a valid amount.", "error"); return; }
  if (!payType)            { showToast("Please select payment type.", "error"); return; }

  const emp = activeAdvances.find(e => String(e.empId).trim() === String(empId).trim());
  if (!emp) { showToast("Employee not found.", "error"); return; }

  if (amount > parseFloat(emp.balanceDue)) {
    showToast(`Amount exceeds balance! Max: ₹${fmtNum(emp.balanceDue)}`, "error");
    return;
  }

  const btn = document.querySelector(".btn-primary[onclick='submitRecovery()']");
  if (btn) { btn.disabled = true; btn.textContent = "Recording..."; }

  try {
    const res  = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "addRecovery",
        empId:       String(empId),
        amount:      amount,
        paymentType: payType.value,
        remarks:     remarks
      })
    });
    const data = await res.json();

    if (data.success) {
      if (data.cleared) {
        showToast(`🎉 ₹${fmtNum(amount)} recorded! Balance cleared — ${emp.empName} removed from list.`, "success");
      } else {
        showToast(`✅ ₹${fmtNum(amount)} recorded! Remaining balance: ₹${fmtNum(data.balanceDue)}`, "success");
      }
      document.getElementById("recoveryEmpSelect").value = "";
      document.getElementById("empBalanceInfo").classList.add("hidden");
      document.getElementById("recoveryForm").classList.add("hidden");
      loadAll();
    } else {
      showToast("Error: " + (data.error || "Something went wrong."), "error");
    }
  } catch (err) {
    showToast("Server error. Try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✅ Record Recovery"; }
  }
}

// =============================================
// BALANCE TABLE
// =============================================
async function loadBalance() {
  try {
    const res  = await fetch(GAS_URL + "?action=getBalance");
    const data = await res.json();
    if (!data.success) return;

    const rows = data.data;
    const container = document.getElementById("balanceTable");

    if (rows.length === 0) {
      container.innerHTML = `<div class="loading-msg">No data found.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Emp ID</th><th>Name</th><th>Department</th>
            <th>Total Advance</th><th>Total Recovered</th><th>Balance Due</th><th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.empId}</td>
              <td><strong>${r.empName}</strong></td>
              <td>${r.dept}</td>
              <td>₹${fmtNum(r.totalTaken)}</td>
              <td>₹${fmtNum(r.totalRecovered)}</td>
              <td class="${parseFloat(r.balanceDue) > 0 ? 'bal-due' : 'bal-nil'}">
                ${parseFloat(r.balanceDue) > 0 ? '₹' + fmtNum(r.balanceDue) : '✅ NIL'}
              </td>
              <td>${formatDate(r.lastUpdated)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {}
}

// =============================================
// ALL REQUESTS TABLE
// =============================================
async function loadAllRequests() {
  try {
    const res  = await fetch(GAS_URL + "?action=getAllRequests");
    const data = await res.json();
    if (!data.success) return;

    const rows = data.data;
    const container = document.getElementById("historyTable");

    if (rows.length === 0) {
      container.innerHTML = `<div class="loading-msg">No requests found.</div>`;
      return;
    }

    const statusPill = s => {
      if (s === "Approved")         return `<span class="pill pill-approved">Approved</span>`;
      if (s === "Partial Approved") return `<span class="pill pill-partial">Partial</span>`;
      if (s === "Rejected")         return `<span class="pill pill-rejected">Rejected</span>`;
      return `<span class="pill pill-pending">Pending</span>`;
    };

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Date</th><th>Name</th><th>Dept</th>
            <th>Requested</th><th>Approved</th><th>Status</th><th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td><strong>${r["Request ID"]}</strong></td>
              <td>${formatDate(r["Timestamp"])}</td>
              <td>${r["Employee Name"]}<br><span style="font-size:11px;color:var(--muted)">${r["Employee ID"]}</span></td>
              <td>${r["Department"]}</td>
              <td>₹${fmtNum(r["Amount Requested"])}</td>
              <td>${r["Approved Amount"] ? "₹" + fmtNum(r["Approved Amount"]) : "—"}</td>
              <td>${statusPill(r["Status"])}</td>
              <td style="max-width:150px;white-space:normal;font-size:12px">${r["Remarks"] || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {}
}

// =============================================
// HELPERS
// =============================================
function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast" + (type ? " " + type : "");
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 4000);
}

document.getElementById("approveModal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});
