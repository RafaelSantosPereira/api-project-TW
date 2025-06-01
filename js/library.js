
import { auth, firebaseConfig } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { base_url } from "./api.js";
import { api_key } from "./api.js";
import { movieID } from "./api.js";
import { serieID } from "./api.js";
import { ImageBaseURL } from "./api.js";
const projectId = firebaseConfig.projectId;

 const playlistsSelect = document.querySelector("#playlistsSelect");

 const gridList = document.querySelector(".grid-list");
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector(".addBtn");
  const contCreate = document.querySelector(".createLibrary");
  const createBtn = document.querySelector("#btnCreate");
  const inputField = document.querySelector(".createLibrary input");
  
  
 

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUserPlaylists(user).then(playlists => {
      // Seleciona automaticamente a primeira playlist e dispara o evento "change"
      if (playlists && playlists.length > 0) {
        playlistsSelect.value = playlists[0].id;
        const event = new Event('change');
        playlistsSelect.dispatchEvent(event);
      }
    });

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

async function loadUserPlaylists(user) {
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

  
    playlistsSelect.innerHTML = '';

    if (playlistsSelect) {
      playlists.forEach(({ id, title }) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = title;
        playlistsSelect.appendChild(option);
      });

      playlistsSelect.addEventListener("change", async () => {
        const playlistId = playlistsSelect.value;
        gridList.innerHTML = ``;
        if (!playlistId) return;

        try {
          const token = await user.getIdToken();
          const response = await fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/playlists/${playlistId}/items`,
            {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error("Erro ao buscar items: " + errorText);
          }

          const result = await response.json();

          const items = result.documents?.map(doc => ({
            id: doc.fields.id.stringValue,
            type: doc.fields.type.stringValue
          })) ?? [];

          gridList.innerHTML = ""; 

          items.forEach(item => {
            const { id, type } = item;
            const url =
              type === "movieId"
                ? `${base_url}/movie/${id}?${api_key}`
                : `${base_url}/tv/${id}?${api_key}`;
            const contentType = type === "movieId" ? movieID : serieID;
            getSingleContent(url, 'grid-list', contentType);
          });

        } catch (error) {
          console.error("Erro ao buscar items da playlist:", error);
        }
      });
    }

    console.log("Playlists carregadas:", playlists);
    return playlists; // <- Retorna playlists aqui
  } catch (error) {
    console.error("Erro ao carregar playlists:", error);
    return [];
  }
}


function getSingleContent(url, targetId, type) {
  fetch(url)
    .then(res => res.json())
    .then(item => {
      if (!item.poster_path) return;
      const title = item.title || item.name;
      const year = (item.release_date || item.first_air_date || '').slice(0, 4);
      const rate = item.vote_average?.toFixed(1) || '0.0';
      const container = document.getElementById(targetId);

      container.innerHTML += `
        <div class="movie-card">
          <a href="./detail.html?${type}=${item.id}" class="card-btn">
            <figure class="poster-box card-banner">
              <img src="${ImageBaseURL}${item.poster_path}" class="img-cover" alt="${title}">
            </figure>
            <div class="card-wrapper">
              <h4 class="title">${title}</h4>
              <div class="meta-list">
                <div class="meta-item">
                  <span class="span">${rate}</span>
                  <img src="./assets/images/star.png" width="20" height="20">
                </div>
                <div class="card-badge">${year}</div>
              </div>
            </div>
          </a>
        </div>`;
    })
    .catch(error => console.error("Erro ao carregar item:", error));


}

window.addEventListener('DOMContentLoaded', () => {
   // Search
  const field = document.querySelector('.search-field');
  const btn = document.querySelector('.search-btn');
  const redirect = () => {
    const q = field.value.trim(); if(!q) return;
    window.location.href = `search.html?search=${encodeURIComponent(q)}`;
  };
  btn.addEventListener('click', redirect);
  field.addEventListener('keypress', e => e.key==='Enter' && redirect());

})






