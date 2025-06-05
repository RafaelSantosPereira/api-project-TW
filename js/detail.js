const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('movieId');
const serieId = urlParams.get('serieId')
const strimgMovie = "/movie?"
const strimgSerie = "/tv?"
import { serieID, movieID } from "./api.js";
const api_key = 'api_key=a5d66f53cd4d37e6c21ce410122b6b32';
const ImageBaseURL = 'https://image.tmdb.org/t/p/w780';
const backdropBaseUrl = 'https://image.tmdb.org/t/p/w1280'
const base_url = 'https://api.themoviedb.org/3';
export const movie_search = base_url + '/movie/' + movieId + '?' + api_key;
const credits_search = base_url + '/movie/' + movieId + '/credits?language=en-US&' + api_key
const video_search = base_url + '/movie/' + movieId + '/videos?language=en-US&' + api_key
export const serie_search = base_url + '/tv/' + serieId + '?' + api_key;
const serie_video_search = base_url + '/tv/'+ serieId + '/videos?language=en-US&'+ api_key;
const serie_credits = base_url + '/tv/'+ serieId + '/credits?language=en-US&'+ api_key;

import { auth, firebaseConfig } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
const projectId = firebaseConfig.projectId;

const movies_div = document.querySelector('.slider-inner');
const slider = document.querySelector('.slider-list');
const list = document.querySelector('.movie-list');
const contCreate = document.querySelector(".createLibrary");
const btn = document.querySelector(".addBtn");
const btnAdd = document.getElementById("btnAddTo")
let currentIdType = "";
let currentId = ""

console.log('ID do Filme:', movieId);
const content_div = document.getElementById('container');
if(movieId){
  getContent(movie_search, slider, movies_div, movieID, strimgMovie);

  getCredits(credits_search);
  getvideos(video_search)
  currentIdType = movieID
  currentId = movieId
}
else if(serieId){
  getContent(serie_search, slider, movies_div, serieID, strimgSerie);
  getvideos(serie_video_search)
  getCredits(serie_credits);
  currentIdType = serieID
  currentId = serieId
}





function getContent(url, Slider,parentElement, ID, stringQuery) {
    fetch(url).then(res => res.json()).then(data => {
    
      showMovies(data);
      const genres_id = [];
      data.genres.forEach(genre => {genres_id.push(genre.id);});
      const discoverWithGenres = base_url + "/discover" + stringQuery + api_key + "&language=en-US&sort_by=popularity&page=1&with_genres=" + genres_id.join(',');
      console.log(data);

      // Fazer fetch da URL discoverWithGenres para obter os dados dos filmes com base nos gêneros específicos
      fetch(discoverWithGenres).then(res => res.json()).then(movieData => {
          console.log(movieData); 
          movies_div.innerHTML='';
         showRecomended(movieData.results, Slider,parentElement, ID)
      })
    });
  }

function getCredits(url){
    fetch(url).then(res => res.json()).then(data => {
        
      showCredits(data);  
      console.log(data);
    });
  }
  function getvideos(url) {
    fetch(url).then(res => res.json()).then(data => {
      
      showVideos(data)
      console.log(data);
    });
  }
function showMovies(movie) {

      const { title, first_air_date, name, poster_path, vote_average, release_date, overview, genres, backdrop_path} = movie
      
      const genres_name = [];
      movie.genres.forEach(genres => {
        genres_name.push(" "+genres.name)
      })
      const title_or_name = title || name;
      // se ouver realease date ela tera apenas 4 caracteres caso haja first air date ela tera apenas 4 caracteres
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
      movieOverviewElement.textContent = `${overview}`
      movieYearElement.textContent = `${year}`
      movieRatingElement.textContent = `${rate}`
      movieBackdropImage.style.backgroundImage = `url("${backdropBaseUrl}${backdrop_path}")`;
      
      movieGenresElement.textContent = `${genres_name}`;
      
    };
    function showCredits(movie_cast){
      const{cast, crew} = movie_cast
      
      const cast_name = [];
      let director_name;
      //insere 10 elementos do cast no array cast_name
      for(let i = 0; i < 10 && i < cast.length; i++){
        cast_name.push(" "+cast[i].name)         
      }
      
      crew.forEach(person => {
        if(person.known_for_department === "Directing"){
          director_name = person.name;
          return; // Sai do forEach assim que encontrar o diretor
        }
      });
      const StarringElement = document.getElementById('Starring');
      const DirectorElement = document.getElementById('director');
      const directorLabelElement = document.getElementById('director-label');
      StarringElement.textContent = `${cast_name}`;
      //se nao houver diretor limpa a div
      if(!director_name){
        directorLabelElement.textContent = ``
        DirectorElement.textContent = ``;
      }
      else{
        DirectorElement.textContent = `${director_name}`;
      }
      
      
    }
    function showVideos(trailers){
      
      const { results } = trailers; //results é um array que pertence aos dados obtidos pela função
      const videoInnerElement = document.getElementById('video-inner');
      videoInnerElement.innerHTML = ''; // Limpa o conteúdo anterior
      if(results.length == 0){
        const label = document.getElementById('label-trailers');
        label.innerHTML= ``;
      }
      //percorre o array de trailers 'results' e insere esses trailer num iframe
      for (let i = 0; i < results.length; i++) {
          const trailer = `https://www.youtube.com/embed/${results[i].key}`;
          const videoCard = document.createElement('div');
          videoCard.classList.add('video-card');
  
          videoCard.innerHTML = `
              <iframe frameborder="0" allowfullscreen src="${trailer}"></iframe>
          `;
  
          videoInnerElement.appendChild(videoCard);
      }
    }
    function showRecomended(data, Slider, parentElement, ID){
      data.forEach(movie => {
        const { name, title, first_air_date, poster_path, vote_average, release_date,id, genre_ids, original_language } = movie;
          if(!poster_path){
            return
          }
          const title_or_name = title || name;
          const year = release_date ? release_date.substring(0, 4) : first_air_date ? first_air_date.substring(0, 4) : '';
          const rate = vote_average.toFixed(1);
          const arrowLeft = Slider.querySelector(".bi-chevron-left");
          const arrowRight = Slider.querySelector(".bi-chevron-right");
          let width = 660; // Largura de um cartão, ajuste connforme necessário
    
          arrowLeft.addEventListener("click", () => {
              parentElement.scrollLeft -= width;
          });
    
          arrowRight.addEventListener("click", () => {
              parentElement.scrollLeft += width;
          });
          const movieEl = document.createElement('div');
          movieEl.classList.add('movie-card');   
          movieEl.innerHTML = `
            <a href="./detail.html?${ID}=${id}" class="card-btn"> 
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

    document.addEventListener('DOMContentLoaded', () => {
      onAuthStateChanged(auth, (user) => {

        if (user) {
            btn.addEventListener('click', () => {
            contCreate.classList.toggle('hidden');
            console.log("banana")
          });
          loadUserPlaylists(user);
          btnAdd.addEventListener("click", () =>{
            event.preventDefault();
            console.log("Adicionar item com:", currentIdType, currentId);
            addNew(currentId, currentIdType)
          })
          
        }

        

        


        
        
      });
   });
   async function addNew(contentId, contentType) {
    try {
      const selectedPlaylistId = document.getElementById("playlistsSelect").value;
      if (!selectedPlaylistId) return alert("Seleciona uma playlist");

      const token = await auth.currentUser.getIdToken();

      
      const itemsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/playlists/${selectedPlaylistId}/items`;

      
      const checkItemsResponse = await fetch(itemsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (checkItemsResponse.ok) {
        const itemsData = await checkItemsResponse.json();
        const exists = itemsData.documents?.some(doc => doc.fields?.id?.stringValue === contentId);

        if (exists) {
          alert("Este item já está na playlist!");
          return;
        }
      } 
       

      // Adicionar novo item
      const response = await fetch(itemsUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            id: { stringValue: contentId },
            type: { stringValue: contentType }
          }
        })
      });

      if (!response.ok) throw new Error("Erro ao adicionar item à playlist");

      const data = await response.json();
      console.log("Item adicionado à playlist:", data);
      alert("Conteúdo adicionado com sucesso");

    } catch (error) {
      console.error("Erro ao adicionar à playlist:", error);
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
        if (playlistsSelect) {
          playlistsSelect.innerHTML = "";
          playlists.forEach(({ id, title }) => {
          const option = document.createElement("option");
          option.value = id; // Agora sim, a variável está definida
          option.textContent = title;
          playlistsSelect.appendChild(option);
        });
        }
    
        console.log("Playlists carregadas:", playlists);
    
      } catch (error) {
        console.error("Erro ao carregar playlists:", error);
      }
    }
    
