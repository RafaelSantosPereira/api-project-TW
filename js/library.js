import { auth, firebaseConfig } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { base_url } from "./api.js";
import { api_key } from "./api.js";
import { movieID } from "./api.js";
import { serieID } from "./api.js";
import { ImageBaseURL } from "./api.js";

const projectId = firebaseConfig.projectId;
const playlistsSelect = document.querySelector("#playlistsSelect");
const sortSelect = document.querySelector("#sort");
const gridList = document.querySelector(".grid-list");

let currentItems = [];

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector(".addBtn");
  const contCreate = document.querySelector(".createLibrary");
  const createBtn = document.querySelector("#btnCreate");
  const inputField = document.querySelector(".createLibrary input");
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUserPlaylists(user).then(playlists => {
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

        await createNewPlaylist(user, title);
        inputField.value = ""; 
      });

    } else {
      console.warn("Utilizador não autenticado");
    }
  });

  btn.addEventListener('click', () => {
    contCreate.classList.toggle('hidden');
  });

  sortSelect.addEventListener('change', () => {
    if (currentItems.length > 0) {
      displaySortedItems();
    }
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
      throw new Error("Erro ao buscar playlists");
    }

    const result = await response.json();
    const playlists = result
      .filter(doc => doc.document)
      .map(doc => ({
        id: doc.document.name.split("/").pop(),
        title: doc.document.fields.title.stringValue
      }));

    playlistsSelect.innerHTML = '';
    playlists.forEach(({ id, title }) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = title;
      playlistsSelect.appendChild(option);
    });

    playlistsSelect.addEventListener("change", async () => {
      const playlistId = playlistsSelect.value;
      if (!playlistId) return;
      
      gridList.innerHTML = '';
      currentItems = [];
      await loadPlaylistItems(user, playlistId);
    });

    return playlists;
    
  } catch (error) {
    console.error("Erro ao carregar playlists:", error);
    return [];
  }
}

async function createNewPlaylist(user, title) {
  try {
    const token = await user.getIdToken();
    
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/playlists`,
      {
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
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao criar playlist");
    }

    await loadUserPlaylists(user);
    console.log("Playlist criada com sucesso");
    
  } catch (error) {
    console.error("Erro ao criar playlist:", error);
  }
}

async function loadPlaylistItems(user, playlistId) {
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
      throw new Error("Erro ao buscar items da playlist");
    }

    const result = await response.json();
    const items = result.documents?.map(doc => ({
      id: doc.fields.id.stringValue,
      type: doc.fields.type.stringValue
    })) ?? [];

    currentItems = [];
    for (const item of items) {
      const itemData = await loadSingleItem(item);
      if (itemData) {
        currentItems.push(itemData);
      }
    }

    displaySortedItems();
    
  } catch (error) {
    console.error("Erro ao carregar items da playlist:", error);
  }
}

async function loadSingleItem(item) {
  try {
    const { id, type } = item;
    
    const url = type === "movieId" 
      ? `${base_url}/movie/${id}?${api_key}`
      : `${base_url}/tv/${id}?${api_key}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.poster_path) {
      return null;
    }

    return {
      id: data.id,
      type: type,
      title: data.title || data.name,
      year: (data.release_date || data.first_air_date || '').slice(0, 4),
      rating: data.vote_average || 0,
      popularity: data.popularity || 0,
      releaseDate: data.release_date || data.first_air_date || '',
      posterPath: data.poster_path
    };
    
  } catch (error) {
    console.error(`Erro ao carregar item ${item.id}:`, error);
    return null;
  }
}

function displaySortedItems() {
  const sortedItems = [...currentItems];
  const sortValue = sortSelect.value;

  if (sortValue === 'popularity.desc') {
    sortedItems.sort((a, b) => b.popularity - a.popularity);
    
  } else if (sortValue === 'vote_average.desc') {
    sortedItems.sort((a, b) => b.rating - a.rating);
    
  } else if (sortValue === 'primary_release_date.desc') {
    sortedItems.sort((a, b) => {
      const dateA = new Date(a.releaseDate);
      const dateB = new Date(b.releaseDate);
      return dateB - dateA;
    });
  }

  gridList.innerHTML = "";
  sortedItems.forEach(item => {
    createMovieCard(item);
  });
}

function createMovieCard(item) {
  const contentType = item.type === "movieId" ? movieID : serieID;
  const rate = item.rating.toFixed(1);

  const cardHTML = `
    <div class="movie-card relativeGroup">
      <a href="./detail.html?${contentType}=${item.id}" class="card-btn">
        <figure class="poster-box card-banner">
          <img src="${ImageBaseURL}${item.posterPath}" class="img-cover" alt="${item.title}">
        </figure>
        <div class="card-wrapper">
          <h4 class="title">${item.title}</h4>
          <div class="meta-list">
            <div class="meta-item">
              <span class="span">${rate}</span>
              <img src="./assets/images/star.png" width="20" height="20">
            </div>
            <div class="card-badge">${item.year}</div>
          </div>
        </div>
      </a>

      <div class="contBtDelete">
        <button class="more-btn">⋮</button>
        <div class="delete-menu hidden">
          <button class="delete-item" data-id="${item.id}" data-type="${contentType}">Eliminar</button>
        </div>
      </div>
    </div>`;

  gridList.insertAdjacentHTML('beforeend', cardHTML);
}

const moreBtn = document.querySelector('.more-btn');
if (moreBtn) {
  moreBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const menu = moreBtn.nextElementSibling;
    if (menu) menu.classList.toggle('hidden');
  });
}

// Botão "delete"
const deleteBtn = document.querySelector('.delete-item');
if (deleteBtn) {
  deleteBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const itemId = deleteBtn.getAttribute('data-id');
    const itemType = deleteBtn.getAttribute('data-type');

    await deleteItemFromPlaylist(itemId, itemType);
  });
}

async function deleteItemFromPlaylist(itemId, itemType) {
  const user = auth.currentUser;
  if (!user) {
    alert("Não autenticado");
    return;
  }

  try {
    const token = await user.getIdToken();
    const playlistId = playlistsSelect.value;

    const itemsResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/playlists/${playlistId}/items`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!itemsResponse.ok) {
      throw new Error("Erro ao buscar itens");
    }

    const itemsResult = await itemsResponse.json();

    const targetDocument = itemsResult.documents?.find(doc => {
      const docId = doc.fields.id?.stringValue;
      const docType = doc.fields.type?.stringValue;
      return docId === itemId && docType === itemType;
    });

    if (!targetDocument) {
      alert("Item não encontrado na playlist");
      return;
    }

    const deleteResponse = await fetch(
      `https://firestore.googleapis.com/v1/${targetDocument.name}`,
      {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!deleteResponse.ok) {
      throw new Error("Erro ao eliminar item");
    }

    alert("Item eliminado da playlist!");
    
    await loadPlaylistItems(user, playlistId);
    
  } catch (error) {
    console.error("Erro ao eliminar item:", error);
    alert("Erro ao eliminar item: " + error.message);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const field = document.querySelector('.search-field');
  const btn = document.querySelector('.search-btn');
  
  const redirect = () => {
    const q = field.value.trim();
    if (!q) return;
    window.location.href = `search.html?search=${encodeURIComponent(q)}`;
  };
  
  btn.addEventListener('click', redirect);
  field.addEventListener('keypress', e => e.key === 'Enter' && redirect());
});