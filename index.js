// Banner dinamicamente
import {
  api_key,
  ImageBaseURL,
  base_url,
  discover_movies,
  discover_series,
  topRatedMovies,
  topRatedSeries,
  searchMovie,
  searchSerie,
  trendingMovies,
  trendingSeries,
  movieID,
  serieID,
  trending
} from './js/api.js';
import { auth } from './js/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";


document.addEventListener('DOMContentLoaded', () => {

  const accountBtn = document.querySelector('.user-btn');
  const popup = document.getElementById('account-popup');
  const content = document.getElementById('account-content');

  if (accountBtn && popup && content) {
    accountBtn.addEventListener('click', () => {
      popup.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
      if (!popup.contains(e.target) && !accountBtn.contains(e.target)) {
        popup.classList.add('hidden');
      }
    });

    onAuthStateChanged(auth, user => {
      if (user) {
        content.innerHTML = `
          <p>Olá, ${user.email}</p>
          <a href="#" id="logout-btn">Logout</a>
        `;
        setTimeout(() => {
          const logoutBtn = document.getElementById('logout-btn');
          if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
              await signOut(auth);
              alert("Sessão terminada");
              location.reload();
            });
          }
        }, 0);
      } else {
        content.innerHTML = `
          <a href="login.html">Login</a>
          <a href="create.html">Criar conta</a>
        `;
      }
    });
  }


  function BannerContent(url) {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.results.length) return;
        const slider = document.querySelector('.banner-slider');
        const control = document.querySelector('.control-inner');
        if (!slider || !control) return;

        slider.innerHTML = '';
        control.innerHTML = '';

        data.results.forEach((item, idx) => {
          const backdrop = "https://image.tmdb.org/t/p/original/" + item.backdrop_path;
          const slide = document.createElement('div');
          slide.className = `slider-item${idx === 0 ? ' active' : ''}`;
          slide.innerHTML = `
            <img src="${backdrop}" class="img-cover bannerRatio" loading="eager">
            <div class="banner-content">
              <h2 class="heading">${item.title || item.name}</h2>
              <div class="meta-list">
                <div class="meta-item">${(item.release_date || item.first_air_date || '').slice(0, 4)}</div>
                <div class="meta-item card-badge">${item.vote_average.toFixed(1)}</div>
              </div>
              <p class="banner-text">${item.overview}</p>
              <a href="./detail.html?${item.media_type === 'movie' ? 'movieId' : 'serieId'}=${item.id}" class="btn">
                <img src="./assets/images/play_circle.png" width="24" height="24">
                <span class="span">Watch now</span>
              </a>
            </div>`;
          slider.appendChild(slide);

          const btn = document.createElement('button');
          btn.className = `poster-box slider-item${idx === 0 ? ' active' : ''}`;
          btn.dataset.index = idx;
          btn.innerHTML = `<img src="${ImageBaseURL}${item.poster_path}" class="img-cover" loading="lazy" draggable="false">`;
          control.appendChild(btn);
        });

        const buttons = control.querySelectorAll('button');
        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.index);
            slider.querySelector('.slider-item.active').classList.remove('active');
            slider.children[i].classList.add('active');
            control.querySelector('.active').classList.remove('active');
            btn.classList.add('active');
          });
        });

        // Drag
        let isDragging = false, startX, scrollLeft;
        const dragStart = (e) => {
          isDragging = true;
          startX = e.pageX - control.offsetLeft;
          scrollLeft = control.scrollLeft;
        };
        const dragMove = (e) => {
          if (!isDragging) return;
          e.preventDefault();
          const x = e.pageX - control.offsetLeft;
          const walk = (x - startX) * 1.3;
          control.scrollLeft = scrollLeft - walk;
        };
        const dragEnd = () => { isDragging = false; };
        control.addEventListener('mousedown', dragStart);
        control.addEventListener('mousemove', dragMove);
        control.addEventListener('mouseup', dragEnd);
        control.addEventListener('mouseleave', dragEnd);
      });
  }

  function ScrollSlider(listId, innerId) {
    const container = document.querySelector(`#${listId} .slider-list`);
    const inner = document.getElementById(innerId);
    if (!container || !inner) return;

    const left = container.querySelector('.bi-chevron-left');
    const right = container.querySelector('.bi-chevron-right');
    const width = inner.clientWidth;

    if (left && right) {
      left.onclick = () => inner.scrollBy({ left: -width / 3, behavior: 'smooth' });
      right.onclick = () => inner.scrollBy({ left: width / 3, behavior: 'smooth' });
    }
  }

  // Banner
  BannerContent(trending);

  // Sliders com conteúdo
  getContent(trendingMovies,    'slider-trending-movies', movieID);
  getContent(trendingSeries,    'slider-trending-series', serieID);
  getContent(discover_movies,   'slider-popular-movies', movieID);
  getContent(discover_series,   'slider-popular-series', serieID);
  getContent(topRatedMovies,    'slider-toprated-movies', movieID);
  getContent(topRatedSeries,    'slider-toprated-series', serieID);

  // Scroll sliders
  ScrollSlider('trending-movies',    'slider-trending-movies');
  ScrollSlider('trending-series',    'slider-trending-series');
  ScrollSlider('popular-movies',     'slider-popular-movies');
  ScrollSlider('popular-series',     'slider-popular-series');
  ScrollSlider('toprated-movies',    'slider-toprated-movies');
  ScrollSlider('toprated-series',    'slider-toprated-series');

  // Search
  const field = document.querySelector('.search-field');
  const btn = document.querySelector('.search-btn');
  if (field && btn) {
    const redirectFn = () => {
      const q = field.value.trim(); if (!q) return;
      window.location.href = `search.html?search=${encodeURIComponent(q)}`;
    };
    btn.addEventListener('click', redirectFn);
    field.addEventListener('keypress', e => e.key === 'Enter' && redirectFn());
  }



  const listLink = document.querySelector('.base-list');
        listLink.addEventListener('click', function(){
          localStorage.clear();
          const Sort = 'popularity.desc&vote_count.gte=200';

          localStorage.setItem('CurrentURL', discover_movies + '&sort_by=' + Sort);      
          localStorage.setItem('id', movieID);
          localStorage.setItem('genreIndex', '1');
      })  
});

// getContent para sliders
export function getContent(url, targetId, ID) {
  fetch(url)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById(targetId);
      if (!container || !data.results.length) return;
      container.innerHTML = '';
      data.results.forEach(item => {
        if (!item.poster_path) return;
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        const rate = item.vote_average.toFixed(1);
        container.innerHTML += `
          <div class="movie-card">
            <a href="./detail.html?${ID}=${item.id}" class="card-btn">
              <figure class="poster-box card-banner">
                <img src="${ImageBaseURL}${item.poster_path}" class="img-cover" alt="${title}">
              </figure>
              <div class="card-wrapper">
                <h4 class="title">${title}</h4>
                <div class="meta-list">
                  <div class="meta-item"><span class="span">${rate}</span><img src="./assets/images/star.png" width="20" height="20"></div>
                  <div class="card-badge">${year}</div>
                </div>
              </div>
            </a>
          </div>`;
      });
    });
}


    

// redirecionar com base na pesquisa
export function redirect() {
  const field = document.querySelector('.search-field');
  const q = field?.value.trim();
  if (!q) return;
  window.location.href = `search.html?search=${encodeURIComponent(q)}`;
}


