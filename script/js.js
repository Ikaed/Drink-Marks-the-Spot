var store_info_json;
var store_info_xml;
var map;
var crd;

var systembolaget_data_collection = [];
var id, target, options;
//Väntar på att DOM-dokumentet för home.html har laddats klart

$(document).ready(function () {
    get_crimes()
    atReady();
    get_my_position();
    store_info_json = getJSON_DATA();
    getXML_DATA();

});

//Karta skapas upp och binds med lämpligt element
function atReady() {
    map = L.map('mapid', {
        center: [57.63795968632888, 18.300034431674856],
        zoom: 18,
        minZoom: 2,
        maxZoom: 18
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    button_store_info()
}
// Användarens position inhämtas
//SKA GÖRAS: Koordinaterna för användaren lagras i en global variabel för att sedan användas för att rita trafikförlbindelsen till önskad butik
function get_my_position() {
    var id, target, options;
    function success(pos) {
        crd = pos.coords;
        console.log(pos.coords)
        set_my_position_marker(pos.coords);

        if (target.latitude === crd.latitude && target.longitude === crd.longitude) {
            console.log('Congratulations, you reached the target');
            navigator.geolocation.clearWatch(id);
        }
    }
    function error(err) {
        console.warn('ERROR(' + err.code + '): ' + err.message);
    }
    target = {
        latitude: 0,
        longitude: 0
    };
    options = {
        enableHighAccuracy: true,
        timeout: 1000,
        maximumAge: 0
    };
    id = navigator.geolocation.watchPosition(success, error, options);

}
//Hämtar inladdat JSON data och lagrar det i en global-variabel
function getJSON_DATA() {
    loadJSON(function (response) {
        // Parse JSON string into object
        store_info_json = JSON.parse(response);
        return store_info_json;
    });
}
//Hämtar inladdat XML data och lagrar det i en global-variabel
function getXML_DATA() {
    loadXML(function (response) {
        parser = new DOMParser();
        store_info_xml = parser.parseFromString(response, "text/xml");
        findXMLData(store_info_xml)
    });
}
//Ajax-funktion: Laddar in data från JSON-fil som innefattar de systembolaget butiker som är av intresse
function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', './data/data_store_info.json', true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}
//Ajax-funktion: Laddar in data från systembolagets XML-fil
function loadXML(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/xml");
    xobj.open('GET', './data/systembolaget_info.xml', true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}
//Vi hämtar ut de butiker som är av intresse från systembolagets XML-fil genom att matcha vår objekt.id:et JSON-fil med deras XML-fil tag <Nr> (representerar id för butik)
function findXMLData(store_info_xml) {
    var xml = store_info_xml;
    var collection = xml.getElementsByTagName("ButikOmbud");
    for (var i = 0; i < collection.length; i++) {
        var x = xml.getElementsByTagName("ButikOmbud")[i];
        var y = x.childNodes[1];
        for (var key in store_info_json) {
            if (store_info_json.hasOwnProperty(key)) {
                if (store_info_json[key].id == y.innerHTML) {
                    systembolaget_data_collection.push(x);
                }
            }
        }
    }
}
//Omvandlar från RT90-projektion (används av systembolaget) till WSG84 projektion (används av OSM)
function transform(long_X, lat_Y) {
    var RT90 = '+proj=tmerc +lat_0=0 +lon_0=15.80827777777778 +k=1 +x_0=1500000 +y_0=0 +ellps=bessel +towgs84=414.1,41.3,603.1,-0.855,2.141,-7.023,0 +units=m +no_defs ';
    var WSG84 = '+proj=longlat +datum=WGS84 +no_defs ';
    var result = proj4(RT90, WSG84, [lat_Y, long_X]);
    return result;
}
//Lyssnare för vald butik
// Data från vår JSON-fil med intressanta butiker kontrolleras och skickas sedan in i modal_info_store funktionen
function button_store_info() {
    var data = document.getElementsByClassName("store");
    var stores = [...data];

    stores.forEach(function (store) {
        store.addEventListener("click", function () {
            modal_info_store(store.id)

        })
    })
}
//Skapar upp modal för vald butik med intressant info
function modal_info_store(id) {
    var modal = `
    <div id="modal"> 
    <h2 id="btn_back">←</h2>
       <div id="modal_content"> 
     
         <h1>` + store_info_json[id].name + `</h1>
         <div id="weather">
      
        </div>
         <div id="store_options">
         <button id="btn_show_on_map" >VISA PÅ KARTA</button>
         <button id="btn_to_store">TA MIG TILL BUTIKEN</button>
       </div>
     </div>
    </div>
    `;
    document.getElementById("navigation").insertAdjacentHTML("afterbegin", modal);
    store_options(id);
     get_weather(id)

}
//Knapplyssnare för butikalternativen som "Visa på karta" och "Ta mig till butiken"
function store_options(id) {
    var button = document.getElementById('btn_show_on_map');
    var button_to_store = document.getElementById('btn_to_store');
    var button_back = document.getElementById('btn_back');
    button.addEventListener('click', function () {
        set_marker(get_store_coordinates(get_store_info(store_info_json[id].id)), get_store_info(store_info_json[id].id));
        go_to_store(get_store_coordinates(get_store_info(store_info_json[id].id)))
    })
     button_to_store.addEventListener('click', function () {
          get_trip(crd, get_store_coordinates(get_store_info(store_info_json[id].id)))
    })
    button_back.addEventListener('click', function () {
        var modal_trip = document.getElementById("modal_trip");
        document.getElementById("modal").remove();
        if(modal_trip!=null){
            console.log(modal_trip);
            modal_trip.remove();
        }
        })
}

//Genom id som erhålls från klickad butik hämtas motsvarande data från systembolagets XML-fil vilken har lagrats i variabeln systembolaget_data_collection
function get_store_info(id){
    var lat;
    var long;
    var store_of_interest;
    for (var i = 0; i < systembolaget_data_collection.length; i++) {
        if (id === systembolaget_data_collection[i].childNodes[1].innerHTML) {
            store_of_interest = systembolaget_data_collection[i];
        }
    }
    return store_of_interest
}

// Hämtar ut förbindelser av intresse (baserat på koordinater) från Resrobot API:t
function get_trip(my_coordinates, store_coordinates) {
    console.log(store_coordinates)
    console.log(store_coordinates)

    var url = "https://api.resrobot.se/v2/trip?key=3442510c-9162-41a9-87eb-1622c469ca29&originCoordLat="+my_coordinates.latitude+"&originCoordLong="+my_coordinates.longitude+
        "&destCoordLat="+store_coordinates[1]+"&destCoordLong="+store_coordinates[0]+"&format=json"
    $.ajax(url).done(function (response) {
        console.log(response['Trip'])
        create_trip(response['Trip'][0]['LegList']['Leg'])
    });
}

function  get_crimes() {
    var url = "https://polisen.se/api/events?type=Rattfylleri;Fylleri/LOB";
    $.ajax(url).done(function (crime) {
        modal_info_crime(crime)
    });
}

function modal_info_crime(crime) {
    var crime_alert;
    var modal = `
    <div id="modal_crime"> 
    <h4 id="crime_title">Aktuella alkolrelaterade brott i hela Sverige</h4>
    <div id="crime_content"></div>
    </div>
    `;
    document.getElementById("side").insertAdjacentHTML("afterbegin", modal);
    for(let i = 0; i<=crime.length; i++){
       crime_alert = `
          <div id="crime_alert"> 
            <h5>`+crime[i]['name']+`</h5>
            <h6>`+crime[i]['summary']+`</h6>
         </div>
    `;
        document.getElementById("crime_content").insertAdjacentHTML("afterbegin", crime_alert);
    }




}

// Väder för stad av intresse (baserat på id) hämtas ut från OpenWeather API:et
function get_weather(id){
        var url = "https://api.openweathermap.org/data/2.5/forecast?id="+store_info_json[id].city_id+"&units=metric&appid=0979d0a2da95b03b55db0b3c9ebaa353"
    $.ajax(url).done(function (response) {
         var modal = `
   <img class="icon" id="icon" src="http://openweathermap.org/img/w/`+response['list'][0]['weather'][0]['icon']+`.png">
   <h4>`+response['list'][0]['main']['temp']+` °C </h4> 
`;
  document.getElementById("weather").insertAdjacentHTML("afterbegin", modal);
    });
}

// Skapar modal som visar rutt med tillhörande trafikförbindelser
function create_trip(trip) {
var counter = 0;
      var modal = `
    <span id="modal_trip"> 
       
    </span>
    `;
    document.getElementById("mapid").insertAdjacentHTML("afterbegin", modal);
for (var i = trip.length-1; i >= 0; i--) {
   counter++
     var modal_data = `
    <span id="modal_trip_content"> 
       <img class="position" src="./image/stop.png">
       <h4>[FRÅN]: ` + trip[i]["Origin"]['name']+`</h4>
       <h4 id="meta_data">[TILL]: ` + trip[i]["Destination"]['name']+`</h4>
    </span>
    `;
     var modal =  document.getElementById("modal_trip");
    modal.insertAdjacentHTML("afterbegin", modal_data);
    modal.setAttribute("style","grid-template-columns: repeat("+counter+", 1fr);")


    if(typeof (trip[i]['Product']) !== 'undefined' ){

         var product = `
         <h4 id="transport">[TRANSPORTMEDEL]:` + trip[i]['Product']['name']+ `</h4>
        `
         var transport =  document.getElementById("meta_data");
          transport.insertAdjacentHTML("beforebegin", product);
          transport.setAttribute("style","grid-template-columns: repeat("+counter+", 1fr);")
    }
    else{

            var product = `
         <h4 id="transport">[GÅNG]:` + trip[i]['duration'].substring(2, trip[i]['duration'].length) + `</h4>
        `
         var transport =  document.getElementById("meta_data");
          transport.insertAdjacentHTML("beforebegin", product);
          transport.setAttribute("style","grid-template-columns: repeat("+counter+", 1fr);")
    }

}
}

// Koordinater för butik av intresse hämtas ut från xml-filen store_of_interest
function get_store_coordinates(store_of_interest) {
    var lat_Y,long_X ;
    long_X = store_of_interest.childNodes[13].innerHTML;
    lat_Y = store_of_interest.childNodes[14].innerHTML;
    var coordinates = transform(parseInt(long_X), parseInt(lat_Y));

    return coordinates
}

function set_marker(coordinates,store_of_interest) {
    //coordinates är en array som håller lat och long koordinater i projektionsformatet WSG84
    var lon = coordinates[0] ? coordinates[0] : coordinates.longitude;
    var lat = coordinates[1] ? coordinates[1]  : coordinates.latitude;
    L.marker([lat, lon]).addTo(map).bindPopup('' +
        '<div>' +
        '<img class="store_img" src="./image/'+store_of_interest.childNodes[1].innerHTML+'.png">'+
        '<h3>'+store_of_interest.childNodes[3].innerHTML+'</h3>' +
        '<a href="https://www.systembolaget.se/ ">Systembolaget</a>'+
        '</div>' +
        '');
}
function set_my_position_marker(coordinates) {
    //coordinates är en array som håller lat och long koordinater i projektionsformatet WSG84
    var lon = coordinates[0] ? coordinates[0] : coordinates.longitude;
    var lat = coordinates[1] ? coordinates[1]  : coordinates.latitude;
    L.marker([lat, lon]).addTo(map).bindPopup("hej")
    map.panTo(new L.LatLng(lat, lon));

}

//Förflyttar kartan så att vald butik centreras på kartbilden
function go_to_store(coordinates) {
    var lon = coordinates[0] ? coordinates[0] : coordinates.longitude;
    var lat = coordinates[1] ? coordinates[1]  : coordinates.latitude;
    map.panTo(new L.LatLng(lat, lon));
    map.setZoom(17);
}
