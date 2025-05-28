
import { auth, firebaseConfig } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

const projectId = firebaseConfig.projectId;



document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector(".addBtn");
  const contCreate = document.querySelector(".createLibrary");
  const createBtn = document.querySelector("#btnCreate");
  const inputField = document.querySelector(".createLibrary input");


  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUserPlaylists(user);

      createBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const title = inputField.value.trim();
        if (!title) {
          alert("Escreve um nome para a playlist!");
          return;
        }

        try {
          const token = await user.getIdToken(); 
          const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/playlists`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              fields: {
                title: { stringValue: title },
                userId: { stringValue: user.uid },
                createdAt: { timestampValue: new Date().toISOString() }
              }
            })
          });

          if (!response.ok) throw new Error("Erro ao criar playlist");
          loadUserPlaylists(user);

          const data = await response.json();
          console.log("Playlist criada:", data);
          inputField.value = ""; 
        } catch (error) {
          console.error("Erro ao gravar no Firestore:", error);
        }
      });

    } else {
      console.warn("Utilizador não autenticado — playlists não carregadas.");
    }
  });

  btn.addEventListener('click', () => {
    contCreate.classList.toggle('hidden');
  });

  
});

export async function loadUserPlaylists(user) {
  try {
    const token = await user.getIdToken();

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "playlists" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "userId" },
                op: "EQUAL",
                value: { stringValue: user.uid }
              }
            },
            orderBy: [{
              field: { fieldPath: "createdAt" },
              direction: "DESCENDING"
            }]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("Erro ao buscar playlists: " + errorText);
    }

    const result = await response.json();
    const playlists = result
      .filter(doc => doc.document)
      .map(doc => ({
        id: doc.document.name.split("/").pop(),
        title: doc.document.fields.title.stringValue
      }));

    const playlistsSelect = document.querySelector("#playlistsSelect");
    if (playlistsSelect) {
      playlistsSelect.innerHTML = "";
      playlists.forEach(({ title }) => {
        const option = document.createElement("option");
        option.value = title;
        option.textContent = title;
        playlistsSelect.appendChild(option);
      });
    }

    console.log("Playlists carregadas:", playlists);

  } catch (error) {
    console.error("Erro ao carregar playlists:", error);
  }
}
