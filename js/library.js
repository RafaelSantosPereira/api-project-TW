document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector(".addBtn");
    const contCreate = document.querySelector(".createLibrary");

    btn.addEventListener('click', () => {
        contCreate.classList.toggle('hidden');
    });
});
