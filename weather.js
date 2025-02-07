document.addEventListener("DOMContentLoaded", () => {
    const weatherDiv = document.getElementById("weather-status");

    fetch("https://snoq.max-4f5.workers.dev/")
        .then(response => response.json())
        .then(data => {
            if (!data.currentConditions || !data.currentConditions.resortLocations) {
                weatherDiv.textContent = "Weather data unavailable";
                return;
            }

            const locations = data.currentConditions.resortLocations.location;
            let weatherHTML = "<h2>Weather by Base Area</h2>";

            locations.forEach(location => {
                const baseDepth = location.base ? `${location.base.inches} inches` : "N/A";
                const snow24h = location.snow24Hours ? `${location.snow24Hours.inches} inches` : "N/A";
                const surfaceCondition = location.primarySurface ? location.primarySurface : "N/A";
                const secondarySurface = location.secondarySurface ? location.secondarySurface : "N/A";
                
                weatherHTML += `
                    <div class="weather-entry" style="background-color: #f0f0f0; padding: 10px; margin: 5px; border-radius: 5px;">
                        <h3>${location.name}</h3>
                        <strong>Base Depth:</strong> ${baseDepth} <br>
                        <strong>Snow (Last 24h):</strong> ${snow24h} <br>
                        <strong>Surface:</strong> ${surfaceCondition}, ${secondarySurface}
                    </div>
                `;
            });

            weatherDiv.innerHTML = weatherHTML;
        })
        .catch(error => {
            console.error("Error fetching weather data:", error);
            weatherDiv.textContent = "Failed to load weather data.";
        });
});
