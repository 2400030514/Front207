document.getElementById("registerForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();
  const usernameError = document.getElementById("usernameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmError = document.getElementById("confirmError");
  const successMsg = document.getElementById("successMsg");

  usernameError.textContent = "";
  emailError.textContent = "";
  passwordError.textContent = "";
  confirmError.textContent = "";
  successMsg.textContent = "";

  usernameError.style.color = "red";
  emailError.style.color = "red";
  passwordError.style.color = "red";
  confirmError.style.color = "red";
  successMsg.style.color = "green";

  let valid = true;
  if (username.length < 4) {
    usernameError.textContent = "Username must be at least 4 characters.";
    valid = false;
  }
  const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
  if (!email.match(emailPattern)) {
    emailError.textContent = "Enter a valid email address.";
    valid = false;
  }
  if (password.length < 8) {
    passwordError.textContent = "Password must be at least 8 characters.";
    valid = false;
  }
  if (confirmPassword !== password) {
    confirmError.textContent = "Passwords do not match.";
    valid = false;
  }
  if (valid) {
    successMsg.textContent = "✅ Registration successful!";
    document.getElementById("registerForm").reset();
  }
});
