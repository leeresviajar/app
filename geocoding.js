// ===================== GEOCODING =====================
const FICTIONAL = {
  'hobbiton':[52.7,-1.8],'la comarca':[52.7,-1.8],'the shire':[52.7,-1.8],
  'mordor':[45.0,35.0],'gondor':[38.0,32.0],'rohan':[47.0,28.0],
  'rivendell':[46.5,8.0],'rivendel':[46.5,8.0],'minas tirith':[37.9,32.8],
  'lothlórien':[48.0,14.0],'lothloren':[48.0,14.0],'erebor':[41.0,44.0],
  'isengard':[44.0,20.0],'moria':[42.0,18.0],
  'hogwarts':[57.0,-4.0],'hogsmeade':[57.1,-4.1],'azkaban':[60.0,-1.0],
  'diagon alley':[51.5,-0.1],'el callejón diagon':[51.5,-0.1],
  'macondo':[10.4,-75.5],'comala':[19.5,-103.8],
  'vetusta':[43.36,-5.84],'orbajosa':[37.5,-4.0],'región':[42.5,-6.0],
  'marineda':[43.37,-8.39],'oleza':[38.1,-1.1],
  'arrakis':[23.5,46.0],'dune':[23.5,46.0],'giedi prime':[15.0,60.0],'caladan':[48.0,-4.0],
  'terramar':[37.9,-122.5],'earthsea':[37.9,-122.5],'anarres':[-30.0,140.0],'omelas':[47.6,-122.3],
  'narnia':[55.0,-3.5],'cair paravel':[55.1,-3.4],
  'westeros':[53.5,-7.5],'desembarco del rey':[43.7,16.0],'kings landing':[43.7,16.0],
  'winterfell':[55.0,-2.0],'rocadragón':[38.7,26.9],'dragonstone':[38.7,26.9],
  'oceania':[51.5,-0.1],'oceanía':[51.5,-0.1],'airstrip one':[51.5,-0.1],
  'gilead':[42.3,-71.0],'panem':[38.9,-77.0],
  'coketown':[53.7,-2.5],'wuthering heights':[53.9,-2.0],'thornfield':[53.8,-1.8],
  'manderley':[50.4,-4.7],'mansfield park':[52.5,-0.9],
  'tlön':[-30.0,-65.0],'uqbar':[-33.0,-70.0],
  'neverwhere':[51.5,-0.12],'stardust':[54.0,-2.0],'american gods':[43.0,-89.0],
  'ankh-morpork':[51.5,-0.1],'lancre':[54.0,-2.5],
  'capricorno':[47.4,8.5],'ombra':[47.0,8.0],'tintamundo':[47.2,8.3],
  'isla misteriosa':[-35.0,-110.0],'centro de la tierra':[64.0,-19.0],
  'el castillo':[50.0,14.5],'the castle':[50.0,14.5],
  'dorothea':[45.5,9.1],'anastasia':[45.3,9.3],'isidora':[45.6,9.0],'octavia':[44.0,8.5],
  'trost':[54.0,13.0],'paradis':[54.5,13.5],
  'konoha':[35.0,136.0],'konohagakure':[35.0,136.0],
  'alabasta':[27.0,30.0],'dressrosa':[39.0,3.0],
  'tarbean':[47.5,19.0],'imre':[48.0,20.0],
  'luthadel':[40.0,45.0],'roshar':[30.0,50.0],
  'bolvangar':[70.0,25.0],'cittàgazze':[44.0,8.0],
  'mid-world':[40.0,-100.0],'la torre oscura':[40.0,-100.0],
  'yoknapatawpha':[34.3,-89.5],'zenda':[48.2,17.0],
  // Memorias de Idhún — Laura Gallego
  'vanis':[50.0,14.4],'vanissar':[50.0,14.4],
  'thalis':[50.06,19.94],'raheld':[50.5,20.0],
  'nurgon':[46.0,14.5],'nandelt':[47.5,19.0],
  'nanetten':[48.5,17.0],'dingra':[49.0,21.0],
  'shia':[46.5,16.0],'arén':[49.2,20.5],
  'celestia':[36.5,26.0],
  'rhyrr':[36.4,25.4],'kelesban':[34.9,33.6],
  'haai-sil':[37.9,27.3],'vaisel':[35.5,24.0],
  'nanhai':[27.9,86.9],'gran oráculo':[27.5,86.0],
  'kash-tar':[30.0,57.0],'kosh':[29.5,60.0],
  'lumbak':[22.5,58.5],'nin':[28.0,55.0],
  'bosque de awa':[48.0,8.2],'awa':[48.0,8.2],
  'derbhad':[49.5,13.5],'torre de derbhad':[49.5,13.5],
  'alis lithban':[62.0,26.0],'bosque de alis lithban':[62.0,26.0],
  'awinor':[64.9,-19.0],'torre de awinor':[64.5,-18.5],
  'drackwen':[62.0,26.0],'torre de drackwen':[62.5,26.5],
  'kazlunn':[57.2,-4.5],'torre de kazlunn':[57.2,-4.5],
  'monte lunn':[57.0,-4.8],
  'shur-ikail':[60.0,60.0],'anillo de hielo':[72.0,25.0],
  'raden':[42.0,52.0],
  'gantadd':[32.0,50.0],'oráculo de gantadd':[32.0,50.0],
  'oráculo de awa':[48.0,8.2],'oráculo de raden':[42.0,52.0],
  'limbhad':[49.0,10.0],'umadhun':[20.0,65.0],
};

const FICTIONAL_EXACT_ONLY = new Set(['region', 'región', 'oceania', 'oceanía', 'dune', 'nin']);
function _matchesFictional(key, k) {
  if (key === k) return true;
  if (k.length <= 4 || FICTIONAL_EXACT_ONLY.has(k)) return false;
  const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  return re.test(key);
}

// País real de un lugar imaginario: código ISO-2 cuando el lugar está anclado
// en un país que existe (Hogwarts en Reino Unido, Macondo en Colombia), y null
// cuando vive en un mundo aparte (Narnia, la Tierra Media, Ankh-Morpork).
// Curación manual: casi todo se queda en null a propósito. NO deducirlo de las
// coordenadas — las de FICTIONAL son colocaciones inventadas para el mapa, no
// ubicaciones geográficas. Mismas claves que FICTIONAL, alias incluidos: los
// alias de un mismo lugar llevan el mismo valor.
//
// REGLA para ampliar el catálogo: anclar solo si el país existe con ese nombre
// y en ese mundo. Quedan fuera, y son las tres trampas habituales:
//   · mundos que no son la Tierra — Konoha está en el País del Fuego, y que la
//     inspiración sea japonesa no la pone en Japón
//   · lugares deliberadamente sin ubicar — Omelas viene de leer "Salem, Oregon"
//     al revés, pero eso es el origen del nombre, no una ubicación
//   · estados sucesores — Panem, Gilead y Oceanía ocupan geografía real pero
//     sustituyen al país: anclar Panem a US diría que quien lee Los juegos del
//     hambre ha viajado a un Estados Unidos que en ese libro ya no existe
const FICTIONAL_REAL_COUNTRY = {
  'hobbiton':null,'la comarca':null,'the shire':null,
  'mordor':null,'gondor':null,'rohan':null,
  'rivendell':null,'rivendel':null,'minas tirith':null,
  'lothlórien':null,'lothloren':null,'erebor':null,
  'isengard':null,'moria':null,
  'hogwarts':'GB','hogsmeade':'GB','azkaban':'GB',
  'diagon alley':'GB','el callejón diagon':'GB',
  'macondo':'CO','comala':'MX',
  'vetusta':'ES','orbajosa':'ES','región':'ES',
  'marineda':'ES','oleza':'ES',
  'arrakis':null,'dune':null,'giedi prime':null,'caladan':null,
  'terramar':null,'earthsea':null,'anarres':null,'omelas':null,
  'narnia':null,'cair paravel':null,
  'westeros':null,'desembarco del rey':null,'kings landing':null,
  'winterfell':null,'rocadragón':null,'dragonstone':null,
  'oceania':null,'oceanía':null,'airstrip one':null,
  'gilead':null,'panem':null,
  'coketown':'GB','wuthering heights':'GB','thornfield':'GB',
  'manderley':'GB','mansfield park':'GB',
  'tlön':null,'uqbar':null,
  'neverwhere':'GB','stardust':null,'american gods':null,
  'ankh-morpork':null,'lancre':null,
  'capricorno':null,'ombra':null,'tintamundo':null,
  'isla misteriosa':null,'centro de la tierra':null,
  'el castillo':null,'the castle':null,
  'dorothea':null,'anastasia':null,'isidora':null,'octavia':null,
  'trost':null,'paradis':null,
  'konoha':null,'konohagakure':null,
  'alabasta':null,'dressrosa':null,
  'tarbean':null,'imre':null,
  'luthadel':null,'roshar':null,
  'bolvangar':null,'cittàgazze':null,
  'mid-world':null,'la torre oscura':null,
  'yoknapatawpha':'US','zenda':null,
  // Memorias de Idhún — Laura Gallego
  'vanis':null,'vanissar':null,
  'thalis':null,'raheld':null,
  'nurgon':null,'nandelt':null,
  'nanetten':null,'dingra':null,
  'shia':null,'arén':null,
  'celestia':null,
  'rhyrr':null,'kelesban':null,
  'haai-sil':null,'vaisel':null,
  'nanhai':null,'gran oráculo':null,
  'kash-tar':null,'kosh':null,
  'lumbak':null,'nin':null,
  'bosque de awa':null,'awa':null,
  'derbhad':null,'torre de derbhad':null,
  'alis lithban':null,'bosque de alis lithban':null,
  'awinor':null,'torre de awinor':null,
  'drackwen':null,'torre de drackwen':null,
  'kazlunn':null,'torre de kazlunn':null,
  'monte lunn':null,
  'shur-ikail':null,'anillo de hielo':null,
  'raden':null,
  'gantadd':null,'oráculo de gantadd':null,
  'oráculo de awa':null,'oráculo de raden':null,
  'limbhad':null,'umadhun':null,
};

// Clave canónica de un lugar imaginario, con el mismo emparejador y el mismo
// orden de recorrido que geocode(): gana la primera que casa. Aquí no sirve
// normalizeName(): las claves llevan tildes ('rocadragón', 'tlön', 'arén') y
// quitarlas dejaría de casar.
function fictionalKeyFor(name) {
  const key = (name || '').toLowerCase().trim();
  for (const k of Object.keys(FICTIONAL)) {
    if (_matchesFictional(key, k)) return k;
  }
  return null;
}

function realCountryForFictional(name) {
  const k = fictionalKeyFor(name);
  return k ? (FICTIONAL_REAL_COUNTRY[k] || null) : null;
}

async function geocode(place, askUser = false, fieldLabel = 'destino') {
  const key = place.toLowerCase().trim();
  for (const [k, v] of Object.entries(FICTIONAL)) {
    if (_matchesFictional(key, k)) {
      if (askUser) {
        const overrides = loadPersonalOverrides();
        if (overrides[k]) {
          return { lat: overrides[k].lat, lng: overrides[k].lng, fictional: true, country: '', countryCode: '' };
        }
        return new Promise(resolve => {
          openFictionalModal(k, (lat, lng) => {
            if (lat && lat.cancelled) { resolve({ cancelled: true }); return; }
            if (lat === null) { resolve({ cancelled: true }); return; }
            resolve({ lat, lng, fictional: true, country: '', countryCode: '' });
          });
        });
      }
      const overrides = loadPersonalOverrides();
      if (overrides[k]) return { lat: overrides[k].lat, lng: overrides[k].lng, fictional: true, country: '', countryCode: '' };
      return { lat: v[0], lng: v[1], fictional: true, country: '', countryCode: '' };
    }
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=5&addressdetails=1`, {
      headers: { 'Accept-Language': 'es' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const d = await r.json();
    if (d.length === 0) {
      if (askUser) {
        return new Promise(resolve => {
          openUnknownPlaceModal(place, (result) => resolve(result));
        });
      }
      return null;
    }

    const byCountry = {};
    for (const r of d) {
      const cc = r.address && r.address.country_code;
      if (cc && !byCountry[cc]) byCountry[cc] = r;
    }
    const candidates = Object.values(byCountry);
    // Lugares reales sin país (Antártida, océanos…): Nominatim los devuelve
    // sin country_code y el agrupado por país los dejaría fuera. Son válidos:
    // usamos el mejor resultado tal cual, con país vacío.
    if (candidates.length === 0) {
      const best = d[0];
      return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), fictional: false, country: '', countryCode: '' };
    }
    const needsPicker = candidates.length > 1;

    if (needsPicker && askUser) {
      return new Promise(resolve => {
        openDisambigModal(place, candidates, fieldLabel, (chosen) => {
          if (!chosen) {
            openUnknownPlaceModal(place, (result) => resolve(result));
            return;
          }
          const country = chosen.address ? (chosen.address.country || '') : '';
          const countryCode = chosen.address ? (chosen.address.country_code || '').toUpperCase() : '';
          resolve({ lat: parseFloat(chosen.lat), lng: parseFloat(chosen.lon), fictional: false, country, countryCode });
        });
      });
    }

    const best = candidates[0];
    const country = best.address ? (best.address.country || '') : '';
    const countryCode = best.address ? (best.address.country_code || '').toUpperCase() : '';
    return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), fictional: false, country, countryCode };
  } catch(e) {}
  return null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}
