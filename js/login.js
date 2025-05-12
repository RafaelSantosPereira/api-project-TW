// login.js
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

function validar(nome, pass) {
  if (!nome || !pass) {
    alert("Preencha todos os campos");
    return false;
  }
  if (pass.length < 4) {
    alert("Introduza uma palavra passe com pelo menos 4 caracteres");
    return false;
  }
  if (pass.length > 20) {
    alert("Introduza uma palavra passe com menos de 20 caracteres");
    return false;
  }
  return true;
}

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("nome").value;
  const password = document.getElementById("password").value;

  if (!validar(nome, password)) return;

  try {
    await signInWithEmailAndPassword(auth, nome, password);
    alert("Login bem-sucedido!");
    window.location.href = "index.html";
  } catch (error) {
    alert("Informações incorretas. Tente novamente.");
  }
});
