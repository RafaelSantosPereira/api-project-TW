// create.js
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

function validar(nome, pass, pass2) {
  if (!nome || !pass || !pass2) {
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
  if (pass !== pass2) {
    alert("Confirme a palavra passe");
    return false;
  }
  return true;
}

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("nome").value;
  const password = document.getElementById("password").value;
  const password2 = document.getElementById("password2").value;

  if (!validar(nome, password, password2)) return;

  try {
    await createUserWithEmailAndPassword(auth, nome, password);
    alert("Conta criada com sucesso!");
    window.location.href = "login.html?mensagem=1";
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      alert("Este utilizador já existe");
    } else {
      alert("Erro: " + error.message);
    }
  }
});
