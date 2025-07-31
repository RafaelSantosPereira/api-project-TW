import { 
    api_key,
    ImageBaseURL,
    base_url,
    discover_movies,
    discover_series,
    discover_anime,
    topRatedMovies,
    topRatedSeries,
    searchMovie,
    searchSerie,
    trendingMovies,
    movieID,
    serieID,
} from './api.js';


const container = document.querySelector(".container");
const gridList = document.querySelector(".grid-list");
const contentType = document.getElementById('type');
const sortBy = document.getElementById('sort');
const provider = document.getElementById('provider');
const logo = document.querySelector('.logo');
const customCheckbox = document.getElementById('customCheckbox');
const ContentOption = localStorage.getItem('ContentOption');
let button = document.getElementById('btScience'); 
let buttonAction = document.getElementById('btAction'); 
let buttonAdventure = document.getElementById('btAdventure'); 
let btWar = document.getElementById('btWar');
let btFantasy = document.getElementById('btFantasy');
let btThriller = document.getElementById('btThriller');
let btRomance = document.getElementById('btRomance');
let btHorror = document.getElementById('btHorror');
let ContentURL = "";
let id = localStorage.getItem('id');
let index = parseInt(localStorage.getItem('index') || '2', 10);

// Carrega opções padrão
const defaultSelectedOption = contentType.value;
const defaultSortByOption = sortBy.value;




function removeActiveButton() {
    document.querySelectorAll('.genre-bt').forEach(button => {
        button.classList.remove('genre-bt-active');
    });
}

// Função para salvar a posição de scroll no localStorage
function saveScrollPosition() {
    const scrollPosition = container.scrollTop;
    localStorage.setItem('scrollPosition', scrollPosition);
    localStorage.setItem('index', index);
}

// Função para restaurar a posição de scroll do localStorage
function restoreScrollPosition() {
    const scrollPosition = localStorage.getItem('scrollPosition');
    if (scrollPosition) {
        container.scrollTop = parseInt(scrollPosition, 10);
    }
}

// Evento para salvar a posição de scroll antes de sair da página
window.addEventListener('beforeunload', saveScrollPosition);

document.addEventListener('DOMContentLoaded', function() {
    const url = localStorage.getItem('CurrentURL');
    if (url) {
        gridList.innerHTML = '';
        const lastPageIndex = parseInt(localStorage.getItem('index') || '2', 10);

        // Função para carregar as páginas necessárias
        const loadPages = async (url, id, currentPage, lastPage) => {
            for (let i = currentPage; i <= lastPage; i++) {
                await getContent(`${url}&page=${i}`, gridList, id);
                index = i + 1;
            }
            restoreScrollPosition();
        };

        loadPages(url, id, 1, lastPageIndex);
        console.log(url);
    }

    if (ContentOption === 'series' || ContentOption === 'anime') {   
        button.value = '10765';
        button.textContent = 'Sci-Fi';
        buttonAction.value = '10759';
        buttonAdventure.style.display = 'none';
        btWar.value = '10768';
        btFantasy.style.display = 'none';
        btThriller.style.display = 'none';
        btRomance.style.display = 'none'
        btHorror.style.display = 'none'
    }

    const activeGenres = JSON.parse(localStorage.getItem('activeGenres')) || [];
    activeGenres.forEach(value => {
        const button = document.querySelector(`button[value="${value}"]`);
        if (button) button.classList.add('genre-bt-active');
    });
});


const searchBtn = document.querySelector(".search-btn");
searchBtn.addEventListener('click', redirect);
document.addEventListener('keypress', function(event) {
      
    if (event.key === 'Enter') {
        redirect();
    }
});

logo.addEventListener('click', function() {
    localStorage.clear();
});

contentType.addEventListener('change', function(event) {
    const selectedValue = event.target.value;
    localStorage.setItem('ContentOption', selectedValue);
    localStorage.setItem('genreIndex', '1');
    localStorage.removeItem('activeGenres');
    updateGenreButtons(selectedValue);
    updateContentURL(event.target.value, sortBy.value, provider.value);
    index = 2;
    console.log(ContentURL);
});

sortBy.addEventListener('change', function(event) {
    updateContentURL(contentType.value, event.target.value, provider.value);
    index = 2;
    console.log(ContentURL);
});

provider.addEventListener('change', function(event) {
    updateContentURL(contentType.value, sortBy.value, event.target.value);
    index = 2;
    console.log(ContentURL);
});

customCheckbox.addEventListener('change', function(event) {
    updateContentURL(contentType.value, sortBy.value, provider.value);
    index = 2;
    console.log(ContentURL);
});

container.addEventListener('scroll', function() {
    let url = localStorage.getItem('CurrentURL');
    let id = localStorage.getItem('id');
    const ContainerHeight = container.scrollHeight;
    const ScrollTop = container.scrollTop;
    const diff = ContainerHeight - ScrollTop;
    const height = container.clientHeight;
    if (diff <= height + 250) {
        getContent(`${url}&page=${index}`, gridList, id);
        index++;
    }
});

genresSearch();

function updateContentURL(type, sortOption, provider = null) {
    let baseURL;
    let additionalParams = '';
    let voteCount = 'vote_count.gte=250';
    if (sortOption == 'primary_release_date.desc' || sortOption == 'first_air_date.desc')
        voteCount = 'vote_count.gte=10';
    localStorage.setItem('genreIndex', '1');

    // Verifica o estado da checkbox
    const excludeAnimations = document.getElementById('customCheckbox').checked;
    if (excludeAnimations) {
        additionalParams += '&without_genres=16';
    }

    if (type === 'movies') {
        baseURL = discover_movies;
        localStorage.setItem('id', movieID);
        localStorage.setItem('ContentOption', 'movies');
        voteCount = sortOption === 'vote_average.desc' ? 'vote_count.gte=300' : 'vote_count.gte=200';
    } else if (type === 'series' || type === 'anime') {
        baseURL = discover_series;
        localStorage.setItem('id', serieID);
        localStorage.setItem('ContentOption', 'series');
        if (sortOption === 'primary_release_date.desc')
            sortOption = 'first_air_date.desc';
        else if (sortOption === 'popularity.desc')
            voteCount = 'vote_count.gte=170';
        else
            voteCount = 'vote_count.gte=250';
        if (type === 'anime') {
            additionalParams += '&with_original_language=ja&with_genres=16';
            if (sortOption.includes('vote_average.desc')) {
                voteCount = 'vote_count.gte=70';
            } else if (sortOption.includes('popularity.desc')) {
                voteCount = 'vote_count.gte=40';
            } else {
                voteCount = 'vote_count.gte=20';
            }
            localStorage.setItem('genreIndex', '2');
        }
    }

    ContentURL = `${baseURL}&sort_by=${sortOption}&${voteCount}${additionalParams}`;
    if (provider && provider !== 'all') {
        ContentURL += `&watch_region=US&with_watch_providers=${provider}`;
    }
    
    gridList.innerHTML = '';
    let id = localStorage.getItem('id');
    getContent(ContentURL, gridList, id);
    localStorage.setItem('SortOption', sortOption);
    localStorage.setItem('CurrentURL', ContentURL);
    localStorage.setItem('index', index);

    removeActiveButton();
}

function genresSearch() {
    document.querySelectorAll('.genre-bt').forEach(button => {
        button.addEventListener('click', function(event) {
            let genreIndex = localStorage.getItem('genreIndex');
            let id = localStorage.getItem('id');
            let url = localStorage.getItem('CurrentURL');

            // Obtém os gêneros ativos armazenados no localStorage ou inicializa um array vazio
            let activeGenres = JSON.parse(localStorage.getItem('activeGenres')) || [];
            const genreValue = event.target.value; 

            if (activeGenres.includes(genreValue)) {
                // Se o gênero já estiver ativo, remove do array activeGenres
                activeGenres = activeGenres.filter(genre => genre !== genreValue);
                event.target.classList.remove('genre-bt-active'); // Remove a classe de botão ativo

                const genresParam = activeGenres.join(',');
                if (genresParam) {
                    url = url.replace(/(&with_genres=[^&]*)/, `&with_genres=${genresParam}`);
                } else {
                    // Se não houver mais gêneros, remove o parâmetro `with_genres` da URL
                    url = url.replace(/&with_genres=[^&]*/, '');
                    localStorage.setItem('genreIndex', '1'); // Redefine o índice do gênero para 1
                }
            } else {
                activeGenres.push(genreValue);
                event.target.classList.add('genre-bt-active'); 

                if (genreIndex == '1') {
                    url += `&with_genres=${genreValue}`;
                } else {
                    url += `,${genreValue}`;
                }

                localStorage.setItem('genreIndex', (parseInt(genreIndex) + 1).toString());
            }

            localStorage.setItem('activeGenres', JSON.stringify(activeGenres));
            localStorage.setItem('CurrentURL', url);
            gridList.innerHTML = '';
            getContent(url, gridList, id);
            console.log(url)
        });
    });
}

function updateGenreButtons(type) {
    const buttonFiction = document.getElementById('btScience');
    const buttonAction = document.getElementById('btAction');
    const btWar = document.getElementById('btWar');

    if (type === 'series' || type === 'anime') {   
        buttonFiction.value = '10765';
        buttonFiction.textContent = 'Sci-Fi';
        buttonAction.value = '10759';
        buttonAdventure.style.display = 'none';
        btWar.value = '10768';
        btFantasy.style.display = 'none';
        btThriller.style.display = 'none';
        btRomance.style.display = 'none'
        btHorror.style.display = 'none'

    } else {
        buttonFiction.value = '878';
        buttonFiction.textContent = 'Science Fiction';
        buttonAction.value = '28';
        btWar.value = '10752';
        buttonAdventure.style.display = 'inline-block';
        btFantasy.style.display = 'inline-block';
        btThriller.style.display = 'inline-block';
        btRomance.style.display = 'inline-block'
        btHorror.style.display = 'inline-block'
    }
}

function getContent(url, parentElement, ID) {
  return fetch(url).then(res => res.json()).then(data => {
    if (data.results.length === 0) {
      return false; 
  }
  console.log(data)
  // Se houver resultados, chama a função showContent
    showContent(data.results, parentElement, ID);
    

    return true; 
      
  });
}





function showContent(data,parentElement, ID) {
    
  data.forEach(movie => {
    const { name, title, first_air_date, poster_path, vote_average, release_date,id, genre_ids, original_language } = movie;
      if(!poster_path){
        return
      }
      const title_or_name = title || name;
      const year = release_date ? release_date.substring(0, 4) : first_air_date ? first_air_date.substring(0, 4) : '';
      const rate = vote_average.toFixed(1);
      
      const movieEl = document.createElement('div');
      movieEl.classList.add('movie-card');   
      movieEl.innerHTML = `
        <a href="./detail.html?${ID}=${id} class="card-btn"> 
          <figure class="poster-box card-banner">
            <img src="${ImageBaseURL + poster_path}" class="img-cover" alt="${title_or_name}" >
          </figure>
          <div class="card-wrapper">
            <h4 class="title">${title_or_name}</h4>
            <div class="meta-list">
              <div class="meta-item">
                <span class="span">${rate}</span>
                <img src="./assets/images/star.png" width="20px" height="20px" loading="lazy" alt="rating">             
              </div>
              <div class="card-badge">${year}</div>           
            </div>
          </div>
        </a>
      `;
      parentElement.appendChild(movieEl);

  });
}
// redirecionar com base na pesquisa
function redirect() {
  const field = document.querySelector('.search-field');
  const q = field?.value.trim();
  if (!q) return;
  window.location.href = `search.html?search=${encodeURIComponent(q)}`;
}
