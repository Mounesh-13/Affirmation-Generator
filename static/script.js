document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const form = document.getElementById('affirmation-form');
    const themeInput = document.getElementById('theme');
    const countInput = document.getElementById('count');
    const submitButton = document.getElementById('submit-button');
    const loader = document.getElementById('loader');
    const errorMessageDiv = document.getElementById('error-message');
    const affirmationsListDiv = document.getElementById('affirmations-list');
    const regenerateButton = document.getElementById('regenerate-button');

    // Store the last successful theme for regeneration
    let lastTheme = '';

    /**
     * Toggles the UI into a loading state.
     * @param {boolean} isLoading - True to show loader, false to hide.
     */
    const setLoadingState = (isLoading) => {
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.textContent = 'Generating...';
            loader.style.display = 'block';
            regenerateButton.style.display = 'none'; // Hide regenerate during new generation
            errorMessageDiv.style.display = 'none';
            affirmationsListDiv.innerHTML = '';
        } else {
            submitButton.disabled = false;
            submitButton.textContent = 'Generate Affirmations';
            loader.style.display = 'none';
        }
    };

    /**
     * Displays an error message in the UI.
     * @param {string} message - The error message to display.
     */
    const displayError = (message) => {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        affirmationsListDiv.innerHTML = ''; // Clear previous results
    };

    /**
     * Renders the list of affirmations in the UI.
     * @param {string[]} affirmations - An array of affirmation strings.
     */
    const displayAffirmations = (affirmations) => {
        affirmationsListDiv.innerHTML = ''; // Clear previous content
        affirmations.forEach(text => {
            const affirmationElement = document.createElement('div');
            affirmationElement.className = 'affirmation-item';
            affirmationElement.textContent = text;
            affirmationsListDiv.appendChild(affirmationElement);
        });

        // Show the regenerate button if we got results
        if(affirmations.length > 0) {
            regenerateButton.style.display = 'block';
        }
    };

    /**
     * Main function to handle the fetch request to the backend.
     * @param {string} theme - The theme for the affirmations.
     * @param {number} count - The number of affirmations to generate.
     */
    const getAffirmations = async (theme, count) => {
        setLoadingState(true);
        lastTheme = theme; // Store the theme for potential regeneration

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme, count }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle HTTP errors (e.g., 400, 500) and display the error from the backend
                throw new Error(data.error || `HTTP error! Status: ${response.status}`);
            }

            // Success
            displayAffirmations(data.affirmations);

        } catch (error) {
            console.error('Fetch error:', error);
            displayError(error.message || 'An unexpected error occurred. Please check your connection and try again.');
        } finally {
            setLoadingState(false);
        }
    };

    // --- Event Listeners ---
    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission
        const theme = themeInput.value.trim();
        const count = parseInt(countInput.value, 10);

        // Simple client-side validation
        if (!theme) {
            displayError('Please enter a theme.');
            return;
        }
        
        getAffirmations(theme, count);
    });

    regenerateButton.addEventListener('click', () => {
        if (lastTheme) {
            // Use the last successful theme and the current count
            const count = parseInt(countInput.value, 10);
            themeInput.value = lastTheme; // Update input field for clarity
            getAffirmations(lastTheme, count);
        }
    });
});
