import { searchMovie, searchSerie, movieID, serieID, discover_movies } from "./api.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const search = urlParams.get('search');
const searchBtn = document.getElementById("search-btn")

document.addEventListener('DOMContentLoaded', function () {
    searchContent();

    const searchInput = document.getElementById("search-bar"); 
    const searchBtn = document.getElementById("search-btn");

    searchBtn.addEventListener("click", function () {
        const inputValue = searchInput.value.trim();
        if (inputValue) {
            window.location.href = `./search.html?search=${encodeURIComponent(inputValue)}`;
        }
    });

    searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            const inputValue = searchInput.value.trim();
            if (inputValue) {
                window.location.href = `./search.html?search=${encodeURIComponent(inputValue)}`;
            }
        }
    });


});


function ScrollSlider(containerId, innerId) {
    const container = document.getElementById(containerId);
    const inner = document.getElementById(innerId);

    if (!container || !inner) return;

    const left = container.querySelector('.bi-chevron-left');
    const right = container.querySelector('.bi-chevron-right');

    if (!left || !right) return;

    const width = inner.clientWidth;
    left.onclick = () => inner.scrollBy({ left: -width / 3, behavior: 'smooth' });
    right.onclick = () => inner.scrollBy({ left: width / 3, behavior: 'smooth' });
}

async function searchContent() {
    const URLsearchMovie = searchMovie + search;
    const URLsearchSerie = searchSerie + search;

    const sliderInner = document.getElementById("slider-inner");
    const sliderInner2 = document.getElementById("slider-inner2");
    const movieContainer = document.getElementById("movie-container");
    const serieContainer = document.getElementById("series-container");

    if (sliderInner) sliderInner.innerHTML = '';
    if (sliderInner2) sliderInner2.innerHTML = '';

    try {
        const movieResults = await getContent(URLsearchMovie, "slider-inner", movieID);
        if (!movieResults || movieResults.length === 0) {
            if (movieContainer) movieContainer.innerHTML = "";
        } else {
            ScrollSlider("movie-container", "slider-inner");
        }

        const serieResults = await getContent(URLsearchSerie, "slider-inner2", serieID);
        if (!serieResults || serieResults.length === 0) {
            if (serieContainer) serieContainer.innerHTML = "";
        } else {
            ScrollSlider("series-container", "slider-inner2");
        }

    } catch (error) {
        console.error('Error fetching content:', error);
    }
}

export async function getContent(url, targetId, ID) {
    const container = document.getElementById(targetId);
    if (!container) return [];

    container.innerHTML = '';

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data.results || data.results.length === 0) return [];

        data.results.forEach(item => {
            if (!item.poster_path) return;
            const title = item.title || item.name;
            const year = (item.release_date || item.first_air_date || '').slice(0, 4);
            const rate = item.vote_average.toFixed(1);
            container.innerHTML += `
                <div class="movie-card">
                    <a href="./detail.html?${ID}=${item.id}" class="card-btn">
                        <figure class="poster-box card-banner">
                            <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" class="img-cover" alt="${title}">
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
        });

        return data.results;
    } catch (err) {
        console.error("Failed to fetch or parse data:", err);
        return [];
    }
}
