// =============================================
// LITPAX ADVANCE FORM — form.js
// =============================================

const GAS_URL = "YOUR_GAS_WEB_APP_URL_HERE"; // ← Apna GAS URL daalo

async function submitForm() {
  const empName   = document.getElementById("empName").value.trim();
  const empId     = document.getElementById("empId").value.trim();
  const dept      = document.getElementById("dept").value;
  const amount    = document.getElementById("amount").value.trim();
  const reason    = document.getElementById("reason").value.trim();
  const repayType = document.querySelector('input[name="repayType"]:checked');

  // Validation
  if (!empName || !empId || !dept || !amount || !reason || !repayType) {
    showError("Sab fields bharna zaroori hai.");
    return;
  }
  if (parseFloat(amount) <= 0) {
    showError("Amount sahi daalo.");
    return;
  }

  const btn = document.getElementById("submitBtn");
  document.getElementById("btnText").classList.add("hidden");
  document.getElementById("btnLoader").classList.remove("hidden");
  btn.disabled = true;
  hideError();

  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "submitRequest",
        empName, empId, dept,
        amount: parseFloat(amount),
        reason,
        repayType: repayType.value
      })
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById("formContainer").classList.add("hidden");
      document.getElementById("generatedId").textContent = data.requestId;
      document.getElementById("successMsg").classList.remove("hidden");
    } else {
      showError("Error: " + (data.error || "Kuch gadbad hui."));
    }
  } catch (err) {
    showError("Server se connect nahi hua. Dobara try karein.");
  } finally {
    document.getElementById("btnText").classList.remove("hidden");
    document.getElementById("btnLoader").classList.add("hidden");
    btn.disabled = false;
  }
}

function showError(msg) {
  const el = document.getElementById("errorMsg");
  document.getElementById("errorText").textContent = msg;
  el.classList.remove("hidden");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  document.getElementById("errorMsg").classList.add("hidden");
}
