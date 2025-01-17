//! NOS TRAEMOS TODOS LOS PACKAGES AXIOS, CHEERIO, EXPRESS
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();

// URL de la página principal
// EXTRAEMOS LOS DATOS DEL URL DE LA PAGINA WEB
const url = 'https://es.wikipedia.org/wiki/Categor%C3%ADa:M%C3%BAsicos_de_rap';

app.get('/', (req, res) => {
    // Accedemos a la página principal
    axios.get(url)
        .then((response) => {
            if (response.status === 200) {
                const html = response.data;
                const $ = cheerio.load(html);

                // Título de la página principal
                const pageTitle = $('title').text();
                //console.log(pageTitle);
                //TITULO H1 Categoría:Músicos de rap - Wikipedia, la enciclopedia libre

                // Recoger los enlaces dentro de #mw-pages
                const links = [];
                $('#mw-pages a').each((index, element) => {
                    const link = $(element).attr('href');
                    if (link && link.startsWith('/wiki/')) {
                        links.push(`https://es.wikipedia.org${link}`);
                        //link.startsWith('/wiki/'): Comprueba si el valor del enlace comienza con la cadena /wiki/.
                        //En Wikipedia, los enlaces a otras páginas de la misma enciclopedia 
                        //suelen tener esa estructura. Por ejemplo:/wiki/Eminem/wiki/Hip_hop
                    }
                });

                if (links.length === 0) {
                    return res.send('<h1>No se encontraron enlaces en la página principal.</h1>');
                }

                //Aquí guardaremos los datos finales
                // Scraping de cada enlace
                const allData = [];
                //Recorremos cada enlace y extraemos los datos
                const promesasScrape = links.map((link) => {
                    return axios.get(link).then((pageResponse) => {
                        const pageHtml = pageResponse.data;
                        const $$ = cheerio.load(pageHtml);
                        //Extraemos el título, imágenes y textos
                        const title = $$('h1').text();
                        const images = [];
                        $$('img').each((index, img) => {
                            const src = $$(img).attr('src');
                            if (src) images.push(src.startsWith('//') ? `https:${src}` : src);
                        });
                        const texts = [];
                        $$('p').each((index, p) => {
                            const text = $$(p).text().trim();
                            if (text) texts.push(text);
                        });
                        //Guardamos la info de esta página
                        allData.push({ title, images, texts });
                    });
                });

                // Esperamos a que terminen todas las solicitudes
                Promise.all(promesasScrape)
                    .then(() => {
                        res.send(`
                            <h1>${pageTitle}</h1>
                            <h2>Resultados</h2>
                            <ul>
                                ${allData
                                    .map((data) => `
                                        <li>
                                            <h3>${data.title}</h3>
                                            <p><strong>Imágenes:</strong> ${data.images.map((img) => `<a href="${img}" target="_blank">${img}</a>`).join(', ')}</p>
                                            <p><strong>Textos:</strong> ${data.texts.slice(0, 3).join(' ')}</p>
                                        </li>
                                    `)
                                    .join('')}
                            </ul>
                        `);
                    })
                    .catch((error) => {
                        console.error('Error al procesar las promesas:', error.message);
                        res.status(500).send('Error al procesar los datos.');
                    });
            }
        })
        .catch((error) => {
            console.error('Error al acceder a la página principal:', error.message);
            res.status(500).send('No se pudo acceder a la página principal.');
        });
});

app.listen(3000, () => {
    console.log('Express está escuchando en http://localhost:3000');
});
