const API = "http://localhost:5000/api";

async function signup() {
    const data = {
        name: name.value,
        phone: phone.value,
        email: email.value,
        password: password.value,
        role: role.value
    };

    const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message || "Signup done");
}

async function login() {
    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.value })
    });

    const data = await res.json();

    localStorage.setItem("token", data.token);

    if (data.role === "passenger") {
        window.location = "passenger.html";
    } else {
        window.location = "conductor.html";
    }
}
