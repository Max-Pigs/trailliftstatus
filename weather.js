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

            const locations = data.currentConditions.resortLocations.location;
            let weatherHTML = "<h2>Weather by Location</h2>";
            let snowfallHTML = "<h2>Snowfall Totals by Location</h2>";

            locations.forEach(location => {
                weatherHTML += `
                    <div class="location-section">
                        <h3>${location.name}</h3>
                        <strong>Surface:</strong> ${location.primarySurface || "N/A"} (${location.secondarySurface || "N/A"})<br>
                        <strong>Temperature:</strong> ${location.temperature || "N/A"}°F<br>
                        <strong>Wind:</strong> ${location.windSpeed || "N/A"} mph<br>
                    </div>
                `;
                
                snowfallHTML += `
                    <div class="location-section">
                        <h3>${location.name}</h3>
                        <strong>Last 24h:</strong> ${location.snow24Hours.inches}"<br>
                        <strong>Last 48h:</strong> ${location.snow48Hours.inches}"<br>
                        <strong>Season Total:</strong> ${location.snowSeasonTotal.inches}"<br>
                        <strong>Base Depth:</strong> ${location.base.inches}"<br>
                    </div>
                `;
            });
            
            weatherDiv.innerHTML = weatherHTML;
            snowfallDiv.innerHTML = snowfallHTML;
        })
        .catch(error => {
            console.error("Error fetching weather data:", error);
            weatherDiv.textContent = "Failed to load weather data.";
            snowfallDiv.textContent = "Failed to load snowfall data.";
        });
});
