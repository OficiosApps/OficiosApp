-- Habilitación solicitada de los 135 partidos bonaerenses, una sola vez.
-- Fuente: GeoRef oficial. Misma lista que worker/buenos-aires-regions.mjs.
-- Se conservan los IDs, centros y nombres existentes, los planes, los referidos y CABA.
CREATE TEMP TABLE ba_coverage_catalog (id TEXT PRIMARY KEY, name TEXT, lat REAL, lng REAL);
INSERT INTO ba_coverage_catalog VALUES
('25-de-mayo-ba','25 de Mayo',-35.527209,-60.230284),
('9-de-julio-ba','9 de Julio',-35.481227,-60.975425),
('adolfo-alsina-ba','Adolfo Alsina',-37.196762,-63.056055),
('adolfo-gonzales-chaves-ba','Adolfo Gonzales Chaves',-37.964616,-60.248282),
('alberti-ba','Alberti',-35.036969,-60.281977),
('almirante-brown-ba','Almirante Brown',-34.835619,-58.367373),
('arrecifes-ba','Arrecifes',-34.011812,-60.062664),
('avellaneda-ba','Avellaneda',-34.678199,-58.341145),
('ayacucho-ba','Ayacucho',-37.035431,-58.442557),
('azul-ba','Azul',-36.785935,-59.696478),
('bahia-blanca-ba','Bahía Blanca',-38.584189,-62.169417),
('balcarce-ba','Balcarce',-37.71462,-58.271748),
('baradero-ba','Baradero',-33.931961,-59.492787),
('benito-juarez-ba','Benito Juárez',-37.586111,-59.888398),
('berazategui-ba','Berazategui',-34.818245,-58.155462),
('berisso-ba','Berisso',-34.909355,-57.82838),
('bolivar-ba','Bolívar',-36.298948,-61.14986),
('bragado-ba','Bragado',-35.061412,-60.604047),
('brandsen-ba','Brandsen',-35.22252,-58.175234),
('campana-ba','Campana',-34.138389,-58.882957),
('canuelas-ba','Cañuelas',-35.144804,-58.691094),
('capitan-sarmiento-ba','Capitán Sarmiento',-34.149845,-59.854015),
('carlos-casares-ba','Carlos Casares',-35.749922,-61.374378),
('carlos-tejedor-ba','Carlos Tejedor',-35.379745,-62.42979),
('carmen-de-areco-ba','Carmen de Areco',-34.406798,-59.884413),
('castelli-ba','Castelli',-36.04149,-57.657425),
('chacabuco-ba','Chacabuco',-34.6182,-60.354308),
('chascomus-ba','Chascomús',-35.618688,-57.903981),
('chivilcoy-ba','Chivilcoy',-34.915487,-59.958419),
('colon-ba','Colón',-33.885865,-61.062484),
('coronel-de-marina-leonardo-rosales-ba','Coronel de Marina Leonardo Rosales',-38.849077,-61.835584),
('coronel-dorrego-ba','Coronel Dorrego',-38.670818,-61.095551),
('coronel-pringles-ba','Coronel Pringles',-38.147917,-61.264417),
('coronel-suarez-ba','Coronel Suárez',-37.534856,-61.889092),
('daireaux-ba','Daireaux',-36.640869,-61.89125),
('dolores-ba','Dolores',-36.398938,-57.631926),
('ensenada-ba','Ensenada',-34.84215,-57.979109),
('escobar-ba','Escobar',-34.328683,-58.771179),
('esteban-echeverria-ba','Esteban Echeverría',-34.831214,-58.476948),
('exaltacion-de-la-cruz-ba','Exaltación de la Cruz',-34.295134,-59.155946),
('ezeiza-ba','Ezeiza',-34.876097,-58.564701),
('florencio-varela-ba','Florencio Varela',-34.877745,-58.258555),
('florentino-ameghino-ba','Florentino Ameghino',-34.874106,-62.401716),
('general-alvarado-ba','General Alvarado',-38.202628,-58.071805),
('general-alvear-ba','General Alvear',-36.034711,-60.133153),
('general-arenales-ba','General Arenales',-34.237902,-61.283381),
('general-belgrano-ba','General Belgrano',-35.834662,-58.69808),
('general-guido-ba','General Guido',-36.666035,-57.995737),
('general-juan-madariaga-ba','General Juan Madariaga',-37.153516,-57.230661),
('general-la-madrid-ba','General La Madrid',-37.356128,-61.344131),
('general-las-heras-ba','General Las Heras',-34.909424,-58.995447),
('general-lavalle-ba','General Lavalle',-36.65075,-56.941003),
('general-paz-ba','General Paz',-35.466183,-58.389652),
('general-pinto-ba','General Pinto',-34.669621,-62.039854),
('general-pueyrredon-ba','General Pueyrredón (Mar del Plata)',-37.965683,-57.743028),
('general-rodriguez-ba','General Rodríguez',-34.650616,-58.987847),
('general-san-martin-ba','General San Martín',-34.552772,-58.564282),
('general-viamonte-ba','General Viamonte',-34.997779,-61.049657),
('general-villegas-ba','General Villegas',-34.770261,-62.954199),
('guamini-ba','Guaminí',-36.890676,-62.418531),
('hipolito-yrigoyen-ba','Hipólito Yrigoyen',-36.259189,-61.660188),
('hurlingham-ba','Hurlingham',-34.599283,-58.649525),
('ituzaingo-ba','Ituzaingó',-34.636072,-58.68876),
('jose-c-paz-ba','José C. Paz',-34.511853,-58.777635),
('junin-ba','Junín',-34.546475,-61.00525),
('la-costa-ba','La Costa',-36.697168,-56.71594),
('la-matanza-ba','La Matanza',-34.770348,-58.625446),
('la-plata-ba','La Plata',-35.003847,-58.017778),
('lanus-ba','Lanús',-34.705654,-58.394697),
('laprida-ba','Laprida',-37.516506,-60.768148),
('las-flores-ba','Las Flores',-36.015827,-59.176461),
('leandro-n-alem-ba','Leandro N. Alem',-34.498565,-61.612587),
('lezama-ba','Lezama',-35.849208,-57.894844),
('lincoln-ba','Lincoln',-35.070448,-61.682458),
('loberia-ba','Lobería',-38.090053,-58.69355),
('lobos-ba','Lobos',-35.219586,-59.145742),
('lomas-de-zamora-ba','Lomas de Zamora',-34.754968,-58.424095),
('lujan-ba','Luján',-34.567322,-59.158456),
('magdalena-ba','Magdalena',-35.185103,-57.686128),
('maipu-ba','Maipú',-36.886933,-57.586119),
('malvinas-argentinas-ba','Malvinas Argentinas',-34.487311,-58.712137),
('mar-chiquita-ba','Mar Chiquita',-37.498641,-57.643266),
('marcos-paz-ba','Marcos Paz',-34.814003,-58.847831),
('mercedes-ba','Mercedes',-34.697321,-59.420481),
('merlo-ba','Merlo',-34.711003,-58.741958),
('monte-ba','Monte',-35.509827,-58.767236),
('monte-hermoso-ba','Monte Hermoso',-38.961624,-61.292147),
('moreno-ba','Moreno',-34.610681,-58.810899),
('moron-ba','Morón',-34.649386,-58.619832),
('navarro-ba','Navarro',-35.030484,-59.429359),
('necochea-ba','Necochea',-38.255411,-59.167387),
('olavarria-ba','Olavarría',-36.857634,-60.670205),
('patagones-ba','Patagones',-40.196383,-62.850802),
('pehuajo-ba','Pehuajó',-35.883621,-61.928126),
('pellegrini-ba','Pellegrini',-36.271192,-63.225752),
('pergamino-ba','Pergamino',-33.836067,-60.544783),
('pila-ba','Pila',-36.202984,-58.340443),
('pilar-ba','Pilar',-34.448164,-58.903333),
('pinamar-ba','Pinamar',-37.111074,-56.870283),
('presidente-peron-ba','Presidente Perón',-34.929848,-58.398084),
('puan-ba','Puán',-38.076076,-63.057433),
('punta-indio-ba','Punta Indio',-35.426056,-57.399234),
('quilmes-ba','Quilmes',-34.734971,-58.276858),
('ramallo-ba','Ramallo',-33.587186,-60.057506),
('rauch-ba','Rauch',-36.572194,-58.944141),
('rivadavia-ba','Rivadavia',-35.581057,-63.094762),
('rojas-ba','Rojas',-34.192817,-60.788023),
('roque-perez-ba','Roque Pérez',-35.481636,-59.357512),
('saavedra-ba','Saavedra',-37.770638,-62.434383),
('saladillo-ba','Saladillo',-35.676806,-59.702661),
('salliquelo-ba','Salliqueló',-36.671778,-63.047974),
('salto-ba','Salto',-34.271078,-60.305288),
('san-andres-de-giles-ba','San Andrés de Giles',-34.437731,-59.473199),
('san-antonio-de-areco-ba','San Antonio de Areco',-34.220758,-59.519443),
('san-cayetano-ba','San Cayetano',-38.389073,-59.586326),
('san-fernando-ba','San Fernando',-34.155836,-58.534582),
('san-isidro-ba','San Isidro',-34.486893,-58.537209),
('san-miguel-ba','San Miguel',-34.552134,-58.691784),
('san-nicolas-ba','San Nicolás',-33.482987,-60.293149),
('san-pedro-ba','San Pedro',-33.780986,-59.782626),
('san-vicente-ba','San Vicente',-35.071509,-58.431812),
('suipacha-ba','Suipacha',-34.748574,-59.703386),
('tandil-ba','Tandil',-37.336429,-59.181983),
('tapalque-ba','Tapalqué',-36.347144,-60.131065),
('tigre-ba','Tigre',-34.38202,-58.588174),
('tordillo-ba','Tordillo',-36.390515,-57.273812),
('tornquist-ba','Tornquist',-38.257642,-62.290566),
('trenque-lauquen-ba','Trenque Lauquen',-36.056766,-62.63508),
('tres-arroyos-ba','Tres Arroyos',-38.511814,-60.237417),
('tres-de-febrero-ba','Tres de Febrero',-34.59601,-58.579188),
('tres-lomas-ba','Tres Lomas',-36.4971,-62.863908),
('vicente-lopez-ba','Vicente López',-34.526531,-58.504487),
('villa-gesell-ba','Villa Gesell',-37.367072,-57.063398),
('villarino-ba','Villarino',-39.128565,-62.724599),
('zarate-ba','Zárate',-33.99709,-59.128215);
CREATE TEMP TABLE ba_coverage_before AS
SELECT body, version, lower(hex(randomblob(16))) AS token
FROM market_settings WHERE setting_key='commercial';
UPDATE market_settings
SET body=json_set(body, '$.regions', json((
  SELECT json_group_array(json(region)) FROM (
    SELECT CASE
      WHEN json_extract(r.value,'$.province')='Buenos Aires'
        OR EXISTS (SELECT 1 FROM ba_coverage_catalog c WHERE c.id=json_extract(r.value,'$.id'))
      THEN json_set(r.value,'$.status','activa') ELSE r.value END AS region
    FROM json_each(market_settings.body,'$.regions') r
    UNION ALL
    SELECT json_object('id',c.id,'name',c.name,'province','Buenos Aires','status','activa',
                       'center',json_object('lat',c.lat,'lng',c.lng))
    FROM ba_coverage_catalog c
    WHERE NOT EXISTS (
      SELECT 1 FROM json_each(market_settings.body,'$.regions') r
      WHERE json_extract(r.value,'$.id')=c.id
        OR (json_extract(r.value,'$.province')='Buenos Aires' AND
            json_extract(r.value,'$.name')=c.name COLLATE NOCASE)
    )
  )
))),
version=version+1,
update_token=(SELECT token FROM ba_coverage_before),
updated_by='system:coverage-buenos-aires',
updated_at=CAST(unixepoch('subsec')*1000 AS INTEGER)
WHERE setting_key='commercial' AND json_type(body,'$.regions')='array';
INSERT INTO commercial_audit(id,actor_id,action,entity_id,before_json,after_json,created_at)
SELECT s.update_token,s.updated_by,'province-coverage','buenos-aires',b.body,s.body,s.updated_at
FROM market_settings s JOIN ba_coverage_before b ON s.update_token=b.token
WHERE s.setting_key='commercial';
DROP TABLE ba_coverage_before;
DROP TABLE ba_coverage_catalog;
