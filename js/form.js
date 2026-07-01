// =============================================
// LITPAX ADVANCE FORM — form.js
// =============================================

const GAS_URL = CONFIG.GAS_URL;

let empLookupTimer = null;

// Auto-fill name when Employee ID is typed
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("empId").addEventListener("input", function() {
    clearTimeout(empLookupTimer);
    const empId = this.value.trim();

    if (!empId) {
      setNameField("", false);
      return;
    }

    empLookupTimer = setTimeout(() => fetchEmployee(empId), 600);
  });
});

async function fetchEmployee(empId) {
  try {
    const res  = await fetch(GAS_URL + "?action=getEmployee&empId=" + encodeURIComponent(empId));
    const data = await res.json();

    if (data.success) {
      setNameField(data.empName, true);
    } else {
      setNameField("", false);
    }
  } catch (err) {
    // silent fail
  }
}

function setNameField(name, found) {
  const nameInput = document.getElementById("empName");
  nameInput.value = name;

  const hint = document.getElementById("empNameHint");
  if (!hint) return;

  if (found) {
    hint.textContent = "✅ Employee found";
    hint.className = "field-hint success";
    nameInput.readOnly = true;
    nameInput.style.background = "#f0fdf4";
    nameInput.style.color = "#166534";
  } else {
    hint.textContent = "";
    hint.className = "field-hint";
    nameInput.readOnly = false;
    nameInput.style.background = "";
    nameInput.style.color = "";
  }
}

async function submitForm() {
  const empName   = document.getElementById("empName").value.trim();
  const empId     = document.getElementById("empId").value.trim();
  const dept      = document.getElementById("dept").value;
  const amount    = document.getElementById("amount").value.trim();
  const reason    = document.getElementById("reason").value.trim();
  const repayType = document.querySelector('input[name="repayType"]:checked');

  if (!empName || !empId || !dept || !amount || !repayType) {
    showError("Please fill all required fields.");
    return;
  }
  if (parseFloat(amount) <= 0) {
    showError("Please enter a valid amount.");
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
      showError("Error: " + (data.error || "Something went wrong."));
    }
  } catch (err) {
    showError("Could not connect to server. Please try again.");
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
