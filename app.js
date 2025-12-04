const contenedor = document.getElementById("contenedor");
const buscador = document.getElementById("buscador");
const tipoFiltro = document.getElementById("tipoFiltro");
const paginado = document.getElementById("pagina");

let paginaActual = 1;
const porPagina = 9;
let pokemons = [];
let tiposCargados = false;

/* ======================
   CARGAR TIPOS
====================== */
async function cargarTipos() {
    if (tiposCargados) return;

    const res = await fetch("https://pokeapi.co/api/v2/type");
    const data = await res.json();

    data.results.forEach(t => {
        const option = document.createElement("option");
        option.value = t.name;
        option.textContent = t.name;
        tipoFiltro.appendChild(option);
    });

    tiposCargados = true;
}

/* ======================
   CARGAR LISTA PRINCIPAL
====================== */
async function cargarPokemons() {
    contenedor.innerHTML = "Cargando...";

    const offset = (paginaActual - 1) * porPagina;

    const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${porPagina}&offset=${offset}`);
    const data = await res.json();

    pokemons = await Promise.all(data.results.map(async p => {
        const detalles = await fetch(p.url).then(r => r.json());
        return detalles;
    }));

    mostrarPokemons(pokemons);
    paginado.textContent = `Página ${paginaActual}`;
}

/* ======================
   MOSTRAR TARJETAS
====================== */
function mostrarPokemons(lista) {
    contenedor.innerHTML = "";

    lista.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <h3>${p.id} - ${p.name}</h3>
            <img src="${p.sprites.other['official-artwork'].front_default}">
            <p>Altura: ${p.height}</p>
            <p>Peso: ${p.weight}</p>
            <p>Tipos: ${p.types.map(t => t.type.name).join(", ")}</p>
        `;

        card.onclick = () => abrirModal(p);
        contenedor.appendChild(card);
    });
}

/* ======================
   MODAL DETALLADO
====================== */
async function abrirModal(pokemon) {
    const modal = document.getElementById("modal");
    const body = document.getElementById("modal-body");

    // Species data
    const species = await fetch(pokemon.species.url).then(r => r.json());

    // Categoría
    const categoria = species.genera.find(g => g.language.name === "en").genus;

    // Evolution chain
    const cadena = await fetch(species.evolution_chain.url).then(r => r.json());
    const evoluciones = extraerEvoluciones(cadena.chain);

    // Debilidades
    const tipos = await Promise.all(
        pokemon.types.map(t => fetch(t.type.url).then(r => r.json()))
    );

    let debil = new Set();
    let resist = new Set();
    let inmune = new Set();

    tipos.forEach(t => {
        t.damage_relations.double_damage_from.forEach(x => debil.add(x.name));
        t.damage_relations.half_damage_from.forEach(x => resist.add(x.name));
        t.damage_relations.no_damage_from.forEach(x => inmune.add(x.name));
    });

    body.innerHTML = `
        <h2>${pokemon.name} (#${pokemon.id})</h2>
        <img src="${pokemon.sprites.other['official-artwork'].front_default}">
        
        <p><b>Categoría:</b> ${categoria}</p>
        <p><b>Altura:</b> ${pokemon.height}</p>
        <p><b>Peso:</b> ${pokemon.weight}</p>
        <p><b>Tipos:</b> ${pokemon.types.map(t => t.type.name).join(", ")}</p>
        
        <h3>Evoluciones:</h3>
        ${evoluciones.map(e => `<p>→ ${e}</p>`).join("")}

        <h3>Debilidades:</h3>
        <p>${[...debil].join(", ")}</p>

        <h3>Resistencias:</h3>
        <p>${[...resist].join(", ")}</p>

        <h3>Inmunidades:</h3>
        <p>${[...inmune].join(", ")}</p>
    `;

    modal.style.display = "flex";
}

/* Recorrer cadena evolutiva */
function extraerEvoluciones(chain) {
    let evos = [];

    function recorrer(nodo) {
        evos.push(nodo.species.name);
        nodo.evolves_to.forEach(e => recorrer(e));
    }

    recorrer(chain);
    return evos;
}

/* Cerrar modal */
document.querySelector(".cerrar").onclick = () => {
    document.getElementById("modal").style.display = "none";
};

window.onclick = e => {
    if (e.target === document.getElementById("modal"))
        document.getElementById("modal").style.display = "none";
};

/* ======================
   EVENTOS
====================== */
buscador.addEventListener("input", () => {
    const texto = buscador.value.toLowerCase();
    const filtrado = pokemons.filter(p => p.name.includes(texto));
    mostrarPokemons(filtrado);
});

tipoFiltro.addEventListener("change", () => filtrarPorTipo(tipoFiltro.value));

async function filtrarPorTipo(tipo) {
    if (tipo === "") return cargarPokemons();

    const res = await fetch(`https://pokeapi.co/api/v2/type/${tipo}`);
    const data = await res.json();

    const ids = data.pokemon.map(p => p.pokemon.url.split("/")[6]);

    const filtrados = pokemons.filter(p => ids.includes(String(p.id)));

    mostrarPokemons(filtrados);
}

/* PAGINACIÓN */
document.getElementById("prev").onclick = () => {
    if (paginaActual > 1) {
        paginaActual--;
        cargarPokemons();
    }
};

document.getElementById("next").onclick = () => {
    paginaActual++;
    cargarPokemons();
};

/* INICIO */
cargarTipos();
cargarPokemons();
