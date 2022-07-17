const API_KEY = "ba2941ca9f7b61c7f69d85f776c34525";


function onGeoOK(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    console.log("you live in", lat, lng);

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric`

    console.log(url);
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(data.name, data.weather[0].main);

            const weatherContainer = document.querySelector("#weather span:first-child");
            const cityContainer = document.querySelector("#weather span:last-child");

            cityContainer.innerText = data.name;
            weatherContainer.innerText = data.weather[0].main;
        });
}

function onGeoErr() {
    alert("Can't find your location");
}

navigator.geolocation.getCurrentPosition(onGeoOK, onGeoErr);