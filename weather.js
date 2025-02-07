document.addEventListener("DOMContentLoaded", () => {
    const weatherDiv = document.getElementById("weather");
    const snowfallDiv = document.getElementById("snowfall");

    fetch("https://snoq.max-4f5.workers.dev/")
        .then(response => response.json())
        .then(data => {
            if (!data.currentConditions) {
                weatherDiv.textContent = "Weather data unavailable";
                snowfallDiv.textContent = "Snowfall data unavailable";
                return;
            }

            const conditions = data.currentConditions.resortwide;
            const locations = data.currentConditions.resortLocations.location;
            const baseDepth = locations.find(loc => loc.name === "Summit West").base.inches;

            weatherDiv.innerHTML = `
                <strong>Temperature:</strong> ${conditions.temperature || "N/A"}°F<br>
                <strong>Weather:</strong> ${conditions.weatherSummary || "N/A"}<br>
                <strong>Wind:</strong> ${conditions.windSpeed || "N/A"} mph
            `;

            snowfallDiv.innerHTML = `
                <strong>Last 24h:</strong> ${locations[0].snow24Hours.inches}"<br>
                <strong>Last 48h:</strong> ${locations[0].snow48Hours.inches}"<br>
                <strong>Season Total:</strong> ${locations[0].snowSeasonTotal.inches}"<br>
                <strong>Base Depth:</strong> ${baseDepth}" 
            `;
        })
        .catch(error => {
            console.error("Error fetching weather data:", error);
            weatherDiv.textContent = "Failed to load weather data.";
            snowfallDiv.textContent = "Failed to load snowfall data.";
        });
});
