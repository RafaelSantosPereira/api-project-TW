const urlParams = new URLSearchParams(window.location.search);
const rawMovieId = urlParams.get('movieId');
const rawSerieId = urlParams.get('serieId');

const isValidId = (id) => typeof id === 'string' && /^\d+$/.test(id.trim());
const movieId = isValidId(rawMovieId) ? rawMovieId.trim() : null;
const serieId = isValidId(rawSerieId) ? rawSerieId.trim() : null;

const strimgMovie = "/movie?";
const strimgSerie = "/tv?";
import { 
  serieID, 
  movieID, 
  base_url,
  getMovieDetail,
  getMovieCredits,
  getMovieVideos,
  getMovieProviders,
  getSeriesDetail,
  getSeriesCredits,
  getSeriesVideos,
  getSeriesProviders,
  escapeHtml
} from "../../shared/api.js";

const ImageBaseURL = 'https://image.tmdb.org/t/p/w780';
const backdropBaseUrl = 'https://image.tmdb.org/t/p/w1280';

import { auth, firebaseConfig, createDefaultPlaylist } from "../../shared/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { initI18n, getLanguage, getTranslation } from "../../shared/i18n.js";
import { showToast, showToastKey } from "../../shared/toast.js";
import { getMovieCardSkeletons, getVideoSkeletons } from "../../shared/skeletons.js";
import { updateSEO, injectMovieSchema, injectBreadcrumbSchema } from "../../shared/seo.js";
const projectId = firebaseConfig.projectId;

initI18n();

/**
 * Controla a transição de transparência da header fixa ao fazer scroll
 */
function initDetailHeaderScroll() {
  const header = document.getElementById('detailHeader');
  const container = document.getElementById('container');
  if (!header) return;

  let isScrolled = false;
  const updateHeader = (scrollTop) => {
    const shouldBeScrolled = scrollTop > 30;
    if (shouldBeScrolled !== isScrolled) {
      isScrolled = shouldBeScrolled;
      header.classList.toggle('is-scrolled', isScrolled);
    }
  };

  const onScroll = () => {
    const scrollTop = (container ? container.scrollTop : 0) || window.scrollY || 0;
    updateHeader(scrollTop);
  };

  if (container) {
    container.addEventListener('scroll', onScroll, { passive: true });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Verificação inicial
  onScroll();
}

initDetailHeaderScroll();

/**
 * Controla a barra de pesquisa expansível na header da página de detalhes
 */
function initDetailSearch() {
  const searchBox = document.getElementById('detailSearchBox');
  const searchToggle = document.getElementById('detailSearchToggle');
  const searchInput = document.getElementById('detailSearchInput');
  const searchClose = document.getElementById('detailSearchClose');

  if (!searchBox || !searchToggle || !searchInput) return;

  const openSearch = () => {
    searchBox.classList.add('is-open');
    searchToggle.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      searchInput.focus();
    }, 50);
  };

  const closeSearch = () => {
    searchBox.classList.remove('is-open');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchInput.value = '';
  };

  const executeSearch = () => {
    const query = searchInput.value.trim();
    if (!query) return;
    window.location.href = `../search/search.html?search=${encodeURIComponent(query)}`;
  };

  // Clique no botão de lupa (toggle)
  searchToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    openSearch();
  });

  // Clique no botão fechar (X)
  if (searchClose) {
    searchClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSearch();
      searchToggle.focus();
    });
  }

  // Tecla Enter para pesquisar no input e Escape para fechar
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    } else if (e.key === 'Escape') {
      closeSearch();
      searchToggle.focus();
    }
  });

  // Fechar ao pressionar Escape globalmente se aberto
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchBox.classList.contains('is-open')) {
      closeSearch();
      searchToggle.focus();
    }
  });

  // Fechar ao clicar fora do searchBox
  document.addEventListener('click', (e) => {
    if (searchBox.classList.contains('is-open') && !searchBox.contains(e.target)) {
      closeSearch();
    }
  });
}

initDetailSearch();

const movies_div = document.querySelector('.slider-inner');
const slider = document.querySelector('.slider-list');
const list = document.querySelector('.movie-list');
const contCreate = document.querySelector(".createPlaylist");
const authPromptModal = document.getElementById("authPromptModal");
const btn = document.querySelector(".addBtn");
const btnAdd = document.getElementById("btnAddTo");
let currentIdType = "";
let currentId = "";
let currentMovieItem = null;
let currentCreditsData = null;

const videoInner = document.getElementById('video-inner');
if (videoInner) {
  videoInner.innerHTML = getVideoSkeletons(4);
}
if (movies_div) {
  movies_div.innerHTML = getMovieCardSkeletons(6);
}

let movieDetailPromise = null;
if(movieId){
  movieDetailPromise = fetch(getMovieDetail(movieId)).then(res => res.ok ? res.json() : null);
  getContent(movieDetailPromise, slider, movies_div, movieID, strimgMovie);
  getCredits(getMovieCredits(movieId));
  getvideos(getMovieVideos(movieId));
  getProviders(movieId, 'movie', getMovieProviders(movieId), movieDetailPromise);
  currentIdType = movieID;
  currentId = movieId;
}
else if(serieId){
  movieDetailPromise = fetch(getSeriesDetail(serieId)).then(res => res.ok ? res.json() : null);
  getContent(movieDetailPromise, slider, movies_div, serieID, strimgSerie);
  getvideos(getSeriesVideos(serieId));
  getCredits(getSeriesCredits(serieId));
  getProviders(serieId, 'tv', getSeriesProviders(serieId), movieDetailPromise);
  currentIdType = serieID;
  currentId = serieId;
} else {
  const movieDetail = document.getElementById('movie-detail');
  if (movieDetail) movieDetail.classList.remove('is-loading');
}

function getContent(urlOrPromise, Slider, parentElement, ID, stringQuery) {
    const dataPromise = typeof urlOrPromise === 'string'
      ? fetch(urlOrPromise).then(res => res.json())
      : urlOrPromise;

    dataPromise.then(data => {
      if (!data) {
        const movieDetail = document.getElementById('movie-detail');
        if (movieDetail) movieDetail.classList.remove('is-loading');
        return;
      }
      showMovies(data);
      const genres_id = [];
      data.genres?.forEach(genre => {genres_id.push(genre.id);});
      const discoverWithGenres = `${base_url}/discover${stringQuery}language=${getLanguage()}&sort_by=popularity&page=1&with_genres=${genres_id.join(',')}`;

      // Fazer fetch da URL discoverWithGenres para obter os dados dos filmes com base nos gêneros específicos
      fetch(discoverWithGenres).then(res => res.json()).then(movieData => {
          movies_div.innerHTML='';
          showRecomended(movieData.results || [], Slider, parentElement, ID);
      }).catch(err => {
          console.error("Error loading recommendations:", err);
          if (movies_div) movies_div.innerHTML = '';
      });
    }).catch(err => {
      console.error("Error loading detail:", err);
      const movieDetail = document.getElementById('movie-detail');
      if (movieDetail) movieDetail.classList.remove('is-loading');
    });
}

function getCredits(url){
    fetch(url).then(res => res.json()).then(data => {
      showCredits(data);  
    }).catch(err => console.error("Error loading credits:", err));
}

function getvideos(url) {
    fetch(url).then(res => res.json()).then(data => {
      showVideos(data);
    }).catch(err => {
      console.error("Error loading videos:", err);
      const vInner = document.getElementById('video-inner');
      if (vInner) vInner.innerHTML = '';
      const label = document.getElementById('label-trailers');
      const videoList = document.querySelector('.video-list');
      if (label) label.style.display = 'none';
      if (videoList) videoList.style.display = 'none';
    });
}

function showMovies(movie) {
      const { title, first_air_date, name, poster_path, vote_average, release_date, overview, genres, backdrop_path} = movie;
      
      const genres_name = [];
      movie.genres.forEach(genres => {
        genres_name.push(" " + genres.name);
      });
      const title_or_name = title || name;
      const year = release_date ? release_date.substring(0, 4) : first_air_date ? first_air_date.substring(0, 4) : '';
      const rate = vote_average.toFixed(1);
      const duration = movie.runtime || (movie.seasons ? movie.seasons.length : 0);
      
      const movieTitleElement = document.getElementById('movie-title');
      const moviePosterElement = document.getElementById('movie-poster');
      const movieRatingElement = document.getElementById('movie-rating');
      const movieYearElement = document.getElementById('movie-year');
      const movieOverviewElement = document.getElementById('movie-overview');
      const movieBackdropImage = document.getElementById('backdrop-image');
      const movieGenresElement = document.getElementById('movie-genres');
      const DurationTimeElement = document.getElementById('duration-time');
      
      if(duration === movie.runtime){
        DurationTimeElement.textContent = `${duration}m`;
      }
      else{
        DurationTimeElement.textContent = `${duration} seasons`;
        if(duration <= 1){
          DurationTimeElement.textContent = `${duration} season`;
        }
      }

      movieTitleElement.textContent = `${title_or_name}`;
      moviePosterElement.src = ImageBaseURL + poster_path;
      moviePosterElement.alt = `${title_or_name} Poster`;
      movieOverviewElement.textContent = `${overview}`;
      movieYearElement.textContent = `${year}`;
      movieRatingElement.textContent = `${rate}`;
      movieBackdropImage.style.backgroundImage = `url("${backdropBaseUrl}${backdrop_path}")`;
      
      movieGenresElement.textContent = `${genres_name}`;

      currentMovieItem = movie;

      // Dynamic SEO, Open Graph & Canonical URL update
      const pageTitle = year ? `${title_or_name} (${year}) - TopCinema` : `${title_or_name} - TopCinema`;
      const metaDesc = overview ? overview.slice(0, 160) : `Watch official trailers, see cast details, and explore storyline for ${title_or_name} on TopCinema.`;
      const canonicalUrl = `${window.location.origin}${window.location.pathname}?${currentIdType}=${currentId}`;
      const posterUrl = poster_path ? `${ImageBaseURL}${poster_path}` : (backdrop_path ? `${backdropBaseUrl}${backdrop_path}` : '');

      updateSEO({
        title: pageTitle,
        description: metaDesc,
        canonicalUrl,
        imageUrl: posterUrl,
        type: movieId ? 'video.movie' : 'video.tv_show',
        locale: getLanguage().replace('-', '_')
      });

      const basePath = window.location.pathname.includes('/TopCinema/') ? '/TopCinema' : '';
      injectBreadcrumbSchema([
        { name: 'Home', url: `${window.location.origin}${basePath}/index.html` },
        { name: 'Explore', url: `${window.location.origin}${basePath}/pages/explore/movie-list.html` },
        { name: title_or_name, url: canonicalUrl }
      ]);

      injectMovieSchema(currentMovieItem, currentCreditsData);

      const movieDetail = document.getElementById('movie-detail');
      if (movieDetail) movieDetail.classList.remove('is-loading');
      const posterBox = moviePosterElement?.closest('.movie-poster');
      if (posterBox) posterBox.classList.remove('skeleton');
      if (movieBackdropImage) movieBackdropImage.classList.remove('skeleton');
      if (movieTitleElement) movieTitleElement.classList.remove('skeleton');
      if (movieGenresElement) movieGenresElement.classList.remove('skeleton');
      if (movieOverviewElement) movieOverviewElement.classList.remove('skeleton');
}

function showCredits(movie_cast){
      currentCreditsData = movie_cast;
      if (currentMovieItem) {
        injectMovieSchema(currentMovieItem, currentCreditsData);
      }

      const { cast, crew } = movie_cast;
      
      const cast_name = [];
      let director_name;
      for(let i = 0; i < 10 && i < cast.length; i++){
        cast_name.push(" " + cast[i].name);         
      }
      
      crew.forEach(person => {
        if(person.known_for_department === "Directing"){
          director_name = person.name;
          return;
        }
      });
      const StarringElement = document.getElementById('Starring');
      const DirectorElement = document.getElementById('director');
      const directorLabelElement = document.getElementById('director-label');
      StarringElement.textContent = `${cast_name}`;
      if(!director_name){
        directorLabelElement.textContent = ``;
        DirectorElement.textContent = ``;
      }
      else{
        DirectorElement.textContent = `${director_name}`;
      }
}

function showVideos(trailers) {
      const { results } = trailers || {};
      const videoInnerElement = document.getElementById('video-inner');
      const label = document.getElementById('label-trailers');
      const videoList = document.querySelector('.video-list');

      if (!videoInnerElement) return;
      videoInnerElement.innerHTML = '';

      // Filtrar apenas vídeos válidos do YouTube
      const youtubeVideos = (results || []).filter(v => v.site === 'YouTube' && v.key);

      if (youtubeVideos.length === 0) {
        if (label) label.style.display = 'none';
        if (videoList) videoList.style.display = 'none';
        return;
      }

      if (label) label.style.display = '';
      if (videoList) videoList.style.display = '';

      // Priorizar Trailers oficiais e Teasers sobre Featurettes ou Behind the Scenes
      const priority = {
        'Trailer': 1,
        'Teaser': 2,
        'Clip': 3,
        'Featurette': 4,
        'Behind the Scenes': 5,
        'Bloopers': 6
      };

      youtubeVideos.sort((a, b) => {
        const pA = priority[a.type] || 99;
        const pB = priority[b.type] || 99;
        return pA - pB;
      });

      // Limitar a um máximo saudável (ex: 8 vídeos) para evitar sobrecarga no DOM
      const displayVideos = youtubeVideos.slice(0, 8);

      displayVideos.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.classList.add('video-card');
        videoCard.setAttribute('role', 'button');
        videoCard.setAttribute('tabindex', '0');
        videoCard.setAttribute('aria-label', `Play ${video.name || video.type}`);

        const safeTitle = escapeHtml(video.name || video.type || '');
        const safeType = escapeHtml(video.type || 'Video');
        const safeKey = encodeURIComponent(video.key || '');
        const thumbnailUrl = `https://i.ytimg.com/vi/${safeKey}/hqdefault.jpg`;

        videoCard.innerHTML = `
          <img src="${thumbnailUrl}" class="video-thumbnail" alt="${safeTitle}" loading="lazy">
          <div class="video-play-btn" aria-hidden="true">
            <i class="bi bi-play-fill"></i>
          </div>
          <div class="video-info-overlay">
            <span class="video-type-badge">${safeType}</span>
            <span class="video-title">${safeTitle}</span>
          </div>
        `;

        const playVideo = () => {
          if (videoCard.classList.contains('playing')) return;
          videoCard.classList.add('playing');
          videoCard.removeAttribute('role');
          videoCard.removeAttribute('tabindex');
          videoCard.innerHTML = `
            <iframe 
              frameborder="0" 
              allowfullscreen 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              src="https://www.youtube.com/embed/${safeKey}?autoplay=1&rel=0">
            </iframe>
          `;
        };

        videoCard.addEventListener('click', playVideo);
        videoCard.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playVideo();
          }
        });

        videoInnerElement.appendChild(videoCard);
      });

      setupTrailersCarousel(videoList);
}

/**
 * Carrossel interativo de Trailers com arraste de rato para Desktop (igual ao Banner)
 */
function setupTrailersCarousel(videoList) {
  if (!videoList || videoList.dataset.carouselInit) return;
  videoList.dataset.carouselInit = 'true';

  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasMoved = false;

  const dragStart = (e) => {
    // Apenas responde ao botão primário (esquerdo) do rato
    if (e.button !== 0) return;
    // Não interfere se o utilizador clicar num vídeo que já está a tocar (iframe)
    if (e.target.closest('.video-card.playing')) return;

    isDragging = true;
    hasMoved = false;
    startX = e.pageX - videoList.offsetLeft;
    scrollLeft = videoList.scrollLeft;
    videoList.classList.add('dragging');
  };

  const dragMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - videoList.offsetLeft;
    const walk = (x - startX) * 1.3; // Multiplicador suave idêntico ao banner
    if (Math.abs(walk) > 6) {
      hasMoved = true;
    }
    videoList.scrollLeft = scrollLeft - walk;
  };

  const dragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    videoList.classList.remove('dragging');
    setTimeout(() => {
      hasMoved = false;
    }, 50);
  };

  videoList.addEventListener('mousedown', dragStart);
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);

  // Evita que o clique acidental ao soltar o arraste ative o player do YouTube
  videoList.addEventListener('click', (e) => {
    if (hasMoved) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
}

function showRecomended(data, Slider, parentElement, ID){
      parentElement.innerHTML = '';
      data.forEach(movie => {
        const { name, title, first_air_date, poster_path, vote_average, release_date, id } = movie;
        if (!poster_path) return;
        const title_or_name = escapeHtml(title || name || '');
        const year = release_date ? release_date.substring(0, 4) : first_air_date ? first_air_date.substring(0, 4) : '';
        const rate = (vote_average ?? 0).toFixed(1);

        const movieEl = document.createElement('div');
        movieEl.classList.add('movie-card');   
        movieEl.innerHTML = `
          <a href="./detail.html?${ID}=${id}" class="card-btn"> 
            <figure class="poster-box card-banner">
              <img src="${ImageBaseURL + poster_path}" class="img-cover" alt="${title_or_name}" loading="lazy">
            </figure>
            <div class="card-wrapper">
              <h4 class="title">${title_or_name}</h4>
              <div class="meta-list">
                <div class="meta-item">
                  <span class="span">${rate}</span>
                  <img src="../../assets/images/star.png" width="20px" height="20px" loading="lazy" alt="rating">             
                </div>
                <div class="card-badge">${year}</div>           
              </div>
            </div>
          </a>
        `;
        parentElement.appendChild(movieEl);
      });

      const arrowLeft = Slider.querySelector(".bi-chevron-left");
      const arrowRight = Slider.querySelector(".bi-chevron-right");
      if (arrowLeft && arrowRight) {
        const updateArrows = () => {
          const maxScrollLeft = parentElement.scrollWidth - parentElement.clientWidth;
          const canScroll = maxScrollLeft > 4;
          const atStart = canScroll && parentElement.scrollLeft <= 4;
          const atEnd = canScroll && parentElement.scrollLeft >= maxScrollLeft - 4;

          Slider.classList.toggle('no-scroll', !canScroll);
          Slider.classList.toggle('at-start', atStart);
          Slider.classList.toggle('at-end', atEnd);

          arrowLeft.setAttribute('aria-hidden', !canScroll || atStart ? 'true' : 'false');
          arrowRight.setAttribute('aria-hidden', !canScroll || atEnd ? 'true' : 'false');
        };

        updateArrows();
        requestAnimationFrame(updateArrows);
        setTimeout(updateArrows, 150);

        parentElement.addEventListener('scroll', updateArrows, { passive: true });

        if (window.ResizeObserver) {
          const ro = new ResizeObserver(() => updateArrows());
          ro.observe(parentElement);
        } else {
          window.addEventListener('resize', updateArrows);
        }

        const scrollStep = () => Math.max(parentElement.clientWidth / 3, 200);

        arrowLeft.onclick = () => {
          parentElement.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
        };
        arrowRight.onclick = () => {
          parentElement.scrollBy({ left: scrollStep(), behavior: 'smooth' });
        };
      }
}

let currentUser = auth.currentUser;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    const modalAddPlaylist = document.getElementById("modalAddPlaylist");
    if (modalAddPlaylist && modalAddPlaylist.classList.contains('hidden')) {
      modalAddPlaylist.classList.remove('hidden');
    }
    loadUserPlaylists(user);
  }
});

function setPlaylistModalView(viewName) {
  const viewSelect = document.getElementById("viewSelectPlaylist");
  const viewEmpty = document.getElementById("viewEmptyPlaylist");
  const viewCreate = document.getElementById("viewCreatePlaylist");
  const modalTitle = document.getElementById("playlistModalTitle");
  const inputName = document.getElementById("detailNewPlaylistName");

  if (viewSelect) viewSelect.classList.toggle("hidden", viewName !== "select");
  if (viewEmpty) viewEmpty.classList.toggle("hidden", viewName !== "empty");
  if (viewCreate) viewCreate.classList.toggle("hidden", viewName !== "create");

  if (modalTitle) {
    const titleKey = viewName === "create" ? "create_playlist_title" : "add_to_playlist";
    modalTitle.setAttribute("data-i18n", titleKey);
    try {
      modalTitle.textContent = getTranslation(titleKey);
    } catch (e) {
      modalTitle.textContent = viewName === "create" ? "Create New Playlist" : "Add to Playlist";
    }
  }

  if (viewName === "create" && inputName) {
    inputName.value = "";
    setTimeout(() => inputName.focus(), 60);
  }
}

function closeModals() {
  const modalAddPlaylist = document.getElementById("modalAddPlaylist");
  const authPromptModal = document.getElementById("authPromptModal");
  const overlay = document.getElementById("detailOverlay") || document.querySelector('.overlay');

  if (modalAddPlaylist) modalAddPlaylist.classList.remove('open');
  if (authPromptModal) authPromptModal.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');

  const playlistsSelect = document.querySelector("#playlistsSelect");
  if (playlistsSelect && playlistsSelect.options.length > 0) {
    setPlaylistModalView("select");
  } else {
    setPlaylistModalView("empty");
  }
}

function handleOpenPlaylistModal() {
  const modalAddPlaylist = document.getElementById("modalAddPlaylist");
  const authPromptModal = document.getElementById("authPromptModal");
  let overlay = document.getElementById("detailOverlay") || document.querySelector('.overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'detailOverlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', closeModals);
  }

  const user = auth.currentUser || currentUser;

  if (user) {
    if (authPromptModal) authPromptModal.classList.remove('open');
    if (modalAddPlaylist) {
      const playlistsSelect = document.querySelector("#playlistsSelect");
      if (!modalAddPlaylist.classList.contains('open')) {
        if (playlistsSelect && playlistsSelect.options.length > 0) {
          setPlaylistModalView("select");
        } else {
          setPlaylistModalView("empty");
        }
      }
      modalAddPlaylist.classList.remove('hidden');
      modalAddPlaylist.classList.add('open');
      overlay.classList.add('visible');
    }
  } else {
    if (modalAddPlaylist) modalAddPlaylist.classList.remove('open');
    if (authPromptModal) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      const loginBtn = authPromptModal.querySelector('.auth-prompt-login-btn');
      const signupLink = authPromptModal.querySelector('.auth-link');
      if (loginBtn) loginBtn.href = `../auth/login.html?redirect=${returnUrl}`;
      if (signupLink) signupLink.href = `../auth/create.html?redirect=${returnUrl}`;
      authPromptModal.classList.remove('hidden');
      authPromptModal.classList.add('open');
      overlay.classList.add('visible');
    }
  }
}

function initDetailModals() {
  const overlay = document.getElementById("detailOverlay") || document.querySelector('.overlay');
  if (overlay) {
    overlay.addEventListener('click', closeModals);
  }

  const authPromptModalEl = document.getElementById("authPromptModal");
  if (authPromptModalEl) {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    const loginBtn = authPromptModalEl.querySelector('.auth-prompt-login-btn');
    const signupLink = authPromptModalEl.querySelector('.auth-link');
    if (loginBtn) loginBtn.href = `../auth/login.html?redirect=${returnUrl}`;
    if (signupLink) signupLink.href = `../auth/create.html?redirect=${returnUrl}`;
  }

  const btnCloseModal = document.getElementById('btnCloseModal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeModals);
  }

  const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
  if (btnCloseAuthModal) {
    btnCloseAuthModal.addEventListener('click', closeModals);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });

  const btnDetailEmptyCreate = document.getElementById('btnDetailEmptyCreate');
  if (btnDetailEmptyCreate) {
    btnDetailEmptyCreate.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setPlaylistModalView('create');
    });
  }

  const btnShowCreatePlaylist = document.getElementById('btnShowCreatePlaylist');
  if (btnShowCreatePlaylist) {
    btnShowCreatePlaylist.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setPlaylistModalView('create');
    });
  }

  const btnCancelCreatePlaylist = document.getElementById('btnCancelCreatePlaylist');
  if (btnCancelCreatePlaylist) {
    btnCancelCreatePlaylist.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const playlistsSelect = document.querySelector("#playlistsSelect");
      if (playlistsSelect && playlistsSelect.options.length > 0) {
        setPlaylistModalView("select");
      } else {
        setPlaylistModalView("empty");
      }
    });
  }

  const formDetailCreatePlaylist = document.getElementById('formDetailCreatePlaylist');
  if (formDetailCreatePlaylist) {
    formDetailCreatePlaylist.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const inputName = document.getElementById('detailNewPlaylistName');
      const submitBtn = document.getElementById('btnConfirmCreate');
      const playlistName = inputName?.value.trim();
      if (!playlistName) return;

      const user = auth.currentUser || currentUser;
      if (!user) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
      }

      try {
        const newId = await createDefaultPlaylist(user, playlistName);
        if (newId) {
          await loadUserPlaylists(user);
          const playlistsSelect = document.querySelector('#playlistsSelect');
          if (playlistsSelect) {
            playlistsSelect.value = newId;
          }
          setPlaylistModalView('select');
          showToastKey('playlist_created_success', 'success');
        } else {
          showToastKey('playlist_create_error', 'error');
        }
      } catch (err) {
        console.error("Error creating playlist:", err);
        showToastKey('playlist_create_error', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
        }
      }
    });
  }

  const playlistsSelectEl = document.querySelector('#playlistsSelect');
  if (playlistsSelectEl) {
    ['mousedown', 'click'].forEach(evt => playlistsSelectEl.addEventListener(evt, e => e.stopPropagation()));
  }

  const formAddToPlaylist = document.getElementById('formAddToPlaylist');
  const btnAdd = document.getElementById("btnAddTo");

  const handleAddSubmit = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const submitBtn = document.getElementById("btnAddTo");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }
    try {
      const success = await addNew(currentId, currentIdType);
      if (success) {
        closeModals();
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    }
  };

  if (formAddToPlaylist) {
    formAddToPlaylist.addEventListener('submit', handleAddSubmit);
  }
  if (btnAdd) {
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!formAddToPlaylist) {
        handleAddSubmit(e);
      }
    });
  }
}

// Global click event delegation for .addBtn (only opens playlist modal from movie content)
document.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.addBtn');
  if (addBtn && !addBtn.closest('#modalAddPlaylist') && addBtn.id !== 'btnAddTo') {
    e.preventDefault();
    e.stopPropagation();
    handleOpenPlaylistModal();
  }
});

// Safe execution whether DOM is loading or already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDetailModals);
} else {
  initDetailModals();
}

async function addNew(contentId, contentType) {
    try {
      const selectedPlaylistId = document.getElementById("playlistsSelect")?.value;
      if (!selectedPlaylistId) {
        showToastKey('select_playlist_warning', 'warning');
        return false;
      }

      const activeId = contentId || currentId;
      const activeType = contentType || currentIdType;

      if (!activeId || !activeType) {
        showToastKey('content_loading_wait', 'warning');
        return false;
      }

      const user = auth.currentUser || currentUser;
      if (!user) {
        handleOpenPlaylistModal();
        return false;
      }

      const token = await user.getIdToken();
      const itemsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/playlists/${selectedPlaylistId}/items`;

      const checkItemsResponse = await fetch(itemsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (checkItemsResponse.ok) {
        const itemsData = await checkItemsResponse.json();
        const exists = itemsData.documents?.some(doc => doc.fields?.id?.stringValue === activeId);

        if (exists) {
          showToastKey('item_already_in_playlist', 'warning');
          return false;
        }
      } 

      const response = await fetch(itemsUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            id: { stringValue: activeId },
            type: { stringValue: activeType }
          }
        })
      });

      if (!response.ok) throw new Error("Erro ao adicionar item à playlist");

      showToastKey('content_added_success', 'success');
      return true;

    } catch (error) {
      console.error("Erro ao adicionar à playlist:", error);
      return false;
    }
}

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

        const playlistsSelect = document.querySelector("#playlistsSelect");
        if (playlists.length === 0) {
          if (playlistsSelect) playlistsSelect.innerHTML = "";
          setPlaylistModalView("empty");
          return [];
        }

        if (playlistsSelect) {
          playlistsSelect.innerHTML = "";
          playlists.forEach(({ id, title }) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = title;
            playlistsSelect.appendChild(option);
          });
        }

        setPlaylistModalView("select");
        return playlists;
      } catch (error) {
        console.error("Erro ao carregar playlists:", error);
        return [];
      }
}

/* --------------------------------------------------------------------------
   STREAMING PROVIDERS & AFFILIATE SYSTEM
   -------------------------------------------------------------------------- */

/**
 * Mapeamento de Links de Afiliados por TMDB provider_id.
 * Para monetizar o TopCinema, basta introduzir o teu link de afiliado abaixo:
 */
const AFFILIATE_LINKS = {
  // Exemplos:
  // 8: 'https://www.netflix.com/?affiliate_id=YOUR_ID',
  // 119: 'https://www.primevideo.com/?tag=YOUR_ASSOCIATE_TAG',
  // 9: 'https://www.primevideo.com/?tag=YOUR_ASSOCIATE_TAG',
  // 337: 'https://disneyplus.bn5x.net/c/YOUR_ID',
  // 1899: 'https://max.com/?ref=YOUR_ID',
  // 350: 'https://tv.apple.com/?at=YOUR_ID',
  // 531: 'https://paramountplus.qhm2.net/c/YOUR_ID',
  // 283: 'https://crunchyroll.com/?aff=YOUR_ID',
};

// Websites oficiais dos principais serviços (fallback direto caso ainda não haja link de afiliado)
const DEFAULT_PROVIDER_URLS = {
  8: 'https://www.netflix.com',
  1796: 'https://www.netflix.com',
  9: 'https://www.primevideo.com',
  119: 'https://www.primevideo.com',
  2100: 'https://www.primevideo.com',
  10: 'https://www.primevideo.com',
  337: 'https://www.disneyplus.com',
  384: 'https://www.max.com',
  1899: 'https://www.max.com',
  350: 'https://tv.apple.com',
  2: 'https://tv.apple.com',
  531: 'https://www.paramountplus.com',
  2303: 'https://www.paramountplus.com',
  582: 'https://www.paramountplus.com',
  283: 'https://www.crunchyroll.com',
  1773: 'https://www.skyshowtime.com',
  64: 'https://www.filmin.pt',
  11: 'https://mubi.com',
  307: 'https://globoplay.globo.com',
  2156: 'https://globoplay.globo.com/telecine',
  3: 'https://play.google.com/store/movies',
  35: 'https://www.rakuten.tv',
  192: 'https://www.youtube.com',
  300: 'https://pluto.tv',
  15: 'https://www.hulu.com',
  386: 'https://www.peacocktv.com',
  230: 'https://crave.ca',
  381: 'https://www.canalplus.com',
  21: 'https://www.stan.com.au',
  484: 'https://www.clarovideo.com',
  339: 'https://ver.movistarplus.es',
  130: 'https://www.skystore.com',
  7: 'https://www.vudu.com',
  73: 'https://tubitv.com',
  1794: 'https://www.starz.com'
};

function getProviderUrlByName(providerName) {
  const name = providerName.toLowerCase();
  if (name.includes('netflix')) return 'https://www.netflix.com';
  if (name.includes('prime') || name.includes('amazon')) return 'https://www.primevideo.com';
  if (name.includes('disney')) return 'https://www.disneyplus.com';
  if (name.includes('max') || name.includes('hbo')) return 'https://www.max.com';
  if (name.includes('apple')) return 'https://tv.apple.com';
  if (name.includes('skyshowtime')) return 'https://www.skyshowtime.com';
  if (name.includes('paramount')) return 'https://www.paramountplus.com';
  if (name.includes('crunchyroll')) return 'https://www.crunchyroll.com';
  if (name.includes('filmin')) return 'https://www.filmin.pt';
  if (name.includes('mubi')) return 'https://mubi.com';
  if (name.includes('rtp')) return 'https://www.rtp.pt/play';
  if (name.includes('opto') || name.includes('sic')) return 'https://opto.sic.pt';
  if (name.includes('tvcine')) return 'https://www.tvcine.pt';
  if (name.includes('globoplay') || name.includes('telecine')) return 'https://globoplay.globo.com';
  if (name.includes('pluto')) return 'https://pluto.tv';
  if (name.includes('rakuten')) return 'https://www.rakuten.tv';
  if (name.includes('hulu')) return 'https://www.hulu.com';
  if (name.includes('peacock')) return 'https://www.peacocktv.com';
  if (name.includes('youtube')) return 'https://www.youtube.com';
  if (name.includes('google')) return 'https://play.google.com/store/movies';
  if (name.includes('tubi')) return 'https://tubitv.com';
  if (name.includes('starz')) return 'https://www.starz.com';
  if (name.includes('movistar')) return 'https://ver.movistarplus.es';
  if (name.includes('claro')) return 'https://www.clarovideo.com';
  if (name.includes('crave')) return 'https://www.crave.ca';
  if (name.includes('canal')) return 'https://www.canalplus.com';
  if (name.includes('sky')) return 'https://www.sky.com';
  if (name.includes('vudu') || name.includes('fandango')) return 'https://www.vudu.com';

  // Se for um provedor não mapeado, pesquisa o site oficial do provedor (nunca envia o utilizador para a TMDB!)
  return `https://www.google.com/search?q=${encodeURIComponent(providerName + ' streaming site oficial')}`;
}

function getProviderAffiliateUrl(providerId, providerName, mediaTitle = '') {
  // 1. Link de afiliado prioritário se configurado
  if (AFFILIATE_LINKS[providerId]) {
    return AFFILIATE_LINKS[providerId];
  }

  const query = encodeURIComponent((mediaTitle || '').trim());
  const name = providerName.toLowerCase();

  // 2. Opções de Compra e Aluguer: direciona diretamente para o filme pesquisado na respetiva loja!
  if (providerId === 3 || name.includes('google play') || name.includes('google movies')) {
    return query ? `https://play.google.com/store/search?q=${query}&c=movies` : 'https://play.google.com/store/movies';
  }
  if (providerId === 2 || name.includes('apple tv') || name.includes('itunes')) {
    return query ? `https://tv.apple.com/search?term=${query}` : 'https://tv.apple.com';
  }
  if (providerId === 192 || name.includes('youtube')) {
    return query ? `https://www.youtube.com/results?search_query=${query}` : 'https://www.youtube.com';
  }
  if (providerId === 10 || name.includes('amazon channel') || name.includes('amazon video')) {
    return query ? `https://www.amazon.com/s?k=${query}&i=instant-video` : 'https://www.primevideo.com';
  }
  if (providerId === 35 || name.includes('rakuten')) {
    return query ? `https://www.rakuten.tv/search?q=${query}` : 'https://www.rakuten.tv';
  }
  if (providerId === 7 || name.includes('vudu') || name.includes('fandango')) {
    return query ? `https://www.vudu.com/content/movies/search?searchString=${query}` : 'https://www.vudu.com';
  }
  if (providerId === 130 || name.includes('sky store')) {
    return query ? `https://www.skystore.com/search?q=${query}` : 'https://www.skystore.com';
  }
  if (name.includes('microsoft')) {
    return query ? `https://www.microsoft.com/search/shop/movies?q=${query}` : 'https://www.microsoft.com';
  }

  // 3. Link oficial do serviço de streaming por ID (serviços de assinatura)
  if (DEFAULT_PROVIDER_URLS[providerId]) {
    return DEFAULT_PROVIDER_URLS[providerId];
  }

  // 4. Link oficial do serviço reconhecido por palavras-chave no nome
  return getProviderUrlByName(providerName);
}

async function getProviders(contentId, contentType, url, detailPromise = null) {
  if (!contentId || !contentType) return;
  try {
    const [response, movieData] = await Promise.all([
      fetch(url),
      detailPromise ? detailPromise.catch(() => null) : Promise.resolve(currentMovieItem)
    ]);
    if (!response.ok) {
      hideProvidersSection();
      return;
    }

    // Lê o país diretamente do cabeçalho X-User-Country injetado pelo Cloudflare Worker
    const rawCountry = response.headers.get('X-User-Country');
    const detectedCountry = rawCountry ? rawCountry.trim().toUpperCase() : null;
    const localeCountry = (navigator.language || '').split('-')[1]?.toUpperCase();

    const data = await response.json();
    if (!data || !data.results) {
      hideProvidersSection();
      return;
    }

    // Determina o país ativo (detectado -> locale -> PT -> US -> primeiro disponível)
    let activeCountry = detectedCountry;
    if (!activeCountry || !data.results[activeCountry]) {
      if (localeCountry && data.results[localeCountry]) {
        activeCountry = localeCountry;
      } else if (data.results.US) {
        activeCountry = 'US';
      } else {
        const availableCountries = Object.keys(data.results);
        activeCountry = availableCountries.length > 0 ? availableCountries[0] : null;
      }
    }

    const countryData = activeCountry ? data.results[activeCountry] : null;
    if (!countryData) {
      hideProvidersSection();
      return;
    }

    let streamServices = [
      ...(countryData.flatrate || []),
      ...(countryData.free || []),
      ...(countryData.ads || []),
      ...(countryData.rent || []),
      ...(countryData.buy || []),
    ];


    if ((!streamServices || streamServices.length === 0) && activeCountry !== 'US' && data.results?.US?.flatrate?.length) {
      activeCountry = 'US';
      streamServices = data.results.US.flatrate;
    }

    // Se ainda não houver provedores de streaming, tenta compra ou aluguer
    if (!streamServices || streamServices.length === 0) {
      streamServices = countryData.rent || countryData.buy || [];
    }

    if (!streamServices || streamServices.length === 0) {
      hideProvidersSection();
      return;
    }

    // Título invariante para pesquisa nos provedores de aluguer/compra
    // (não é afetado pela troca de idioma do site, evitando quebrar pesquisas em lojas internacionais)
    const rawOriginal = movieData?.original_title || movieData?.original_name || '';
    const isLatin = /^[\u0000-\u024F\u1E00-\u1EFF\s\d\p{P}]+$/u.test(rawOriginal);
    const enTranslation = movieData?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data;
    const enTitle = enTranslation?.title || enTranslation?.name || '';

    const stableSearchTitle = (isLatin && rawOriginal)
      ? rawOriginal
      : (enTitle || rawOriginal || movieData?.title || movieData?.name || document.getElementById('movie-title')?.textContent?.trim() || '');

    // Deduplica provedores para não exibir logos ou nomes repetidos
    const seenNames = new Set();
    const providers = [];

    for (const p of streamServices) {
      if (!p.logo_path) continue;
      // Normaliza para agrupar variações com anúncios (ex: "Amazon Prime Video with Ads")
      const cleanName = p.provider_name.replace(/\s+with Ads$/i, '').trim();
      if (!seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        providers.push({
          id: p.provider_id,
          name: cleanName,
          logo: `https://image.tmdb.org/t/p/w154${p.logo_path}`,
          affiliateUrl: getProviderAffiliateUrl(p.provider_id, cleanName, stableSearchTitle)
        });
      }
    }

    if (providers.length === 0) {
      hideProvidersSection();
      return;
    }

    displayProviders(providers, activeCountry);
  } catch (error) {
    hideProvidersSection();
  }
}

function displayProviders(providers, countryCode) {
  const section = document.getElementById('providers-section');
  const list = document.getElementById('providers-list');
  const badge = document.getElementById('providers-country-badge');

  if (!section || !list) return;

  list.innerHTML = '';

  if (badge && countryCode) {
    badge.textContent = countryCode;
    badge.title = `Available in ${countryCode}`;
    badge.style.display = 'inline-flex';
  }

  providers.forEach(provider => {
    const card = document.createElement('a');
    card.href = provider.affiliateUrl;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'provider-card';
    const safeProviderName = escapeHtml(provider.name || '');
    card.title = `Watch on ${safeProviderName}`;
    card.setAttribute('aria-label', `Watch on ${safeProviderName}`);
    card.dataset.providerId = provider.id;

    card.innerHTML = `
      <img src="${provider.logo}" alt="${safeProviderName}" class="provider-logo" loading="lazy" width="44" height="44" onerror="this.parentElement.style.display='none'">
      <span class="provider-name">${safeProviderName}</span>
      <i class="bi bi-box-arrow-up-right provider-affiliate-icon" aria-hidden="true"></i>
    `;

    list.appendChild(card);
  });

  section.style.display = 'block';
}

function hideProvidersSection() {
  const section = document.getElementById('providers-section');
  if (section) {
    section.style.display = 'none';
  }
}


