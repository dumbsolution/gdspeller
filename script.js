async function composeMessage() {
    const levelNamesInput = document.getElementById('levelNames').value;
    const resultContainer = document.getElementById('result');

    const levelNames = levelNamesInput
        .match(/(?:[^\s"]+|"[^"]*")+/g)
        .map(word => (word.startsWith('"') && word.endsWith('"') ? word.slice(1, -1) : word))
        .map(word => word.replace(/[^a-zA-Z0-9\s]/g, ''));

    resultContainer.innerHTML = '<h2>Output</h2>';

    if (levelNames && levelNames.length > 0) {
        const composedLevels = [];
        const usedLevelIds = new Set();

        async function processBestOption(currentPhrase, currentIndex, isAlternative) {
            const searchResults = await searchLevels(currentPhrase);
            const options = isAlternative ? searchResults.slice(1) : searchResults;

            for (const option of options) {
                if (!usedLevelIds.has(option.id)) {
                    usedLevelIds.add(option.id);

                    composedLevels.push(option);

                    resultContainer.innerHTML += `<p><strong>${isAlternative ? 'Alternative' : 'Best Option'} Title:</strong> ${option.name}</p>
                                                <p><strong>Creator:</strong> ${option.creator}</p>
                                                <p><strong>ID:</strong> ${option.id || 'No description available'}</p>
                                                <hr>`;
                    return;
                }
            }

            resultContainer.innerHTML += `<p>No more ${isAlternative ? 'alternatives' : 'options'} found for '${currentPhrase}'. Skipping...</p>`;
        }

        async function processWord(index) {
            if (index < levelNames.length) {
                const currentPhrase = levelNames[index];

                if (currentPhrase.length < 2) {
                    resultContainer.innerHTML += `<p>The word ${currentPhrase} is too short.</p>`;
                } else if (currentPhrase.toLowerCase() === 'the') {
                    resultContainer.innerHTML += `<p>The word 'The' breaks the API wrapper for some reason.</p>`;
                } else {
                    try {
                        const levelData = await getLevelData(currentPhrase);

                        if (!usedLevelIds.has(levelData.id)) {
                            usedLevelIds.add(levelData.id);

                            composedLevels.push(levelData);

                            resultContainer.innerHTML += `<p><strong>Title:</strong> ${levelData.name}</p>
                                                        <p><strong>Creator:</strong> ${levelData.creator}</p>
                                                        <p><strong>ID:</strong> ${levelData.id || 'No description available'}</p>
                                                        <hr>`;
                        } else {
                            resultContainer.innerHTML += `<p>Level with ID ${levelData.id} already used. Trying alternatives...</p>`;
                            await processBestOption(currentPhrase, index, true);
                        }
                    } catch (error) {
                        console.error(`Error fetching data for level ${currentPhrase}:`, error);
                        resultContainer.innerHTML += `<p>No exact match found for '${currentPhrase}'. Trying the best option...</p>`;

                        await processBestOption(currentPhrase, index, false);
                    }
                }

                await processWord(index + 1);
                if (index + 1 === levelNames.length) {
                    generateLink(composedLevels);
                }
            } else {
                console.log('Processed Levels:', composedLevels);
            }
        }

        await processWord(0);
    } else {
        resultContainer.innerHTML += '<p>No level names entered.</p>';
    }
}

async function getLevelData(levelName) {
    let currentPage = 1;
    let levelData;

    while (!levelData) {
        try {
            const searchResults = await searchLevels(levelName, currentPage);
            const exactMatch = searchResults.find(result => result.name.toLowerCase() === levelName.toLowerCase());

            if (exactMatch) {
                levelData = exactMatch;
            } else if (searchResults.length === 0) {
                break;
            } else {
                currentPage++;
            }
        } catch (error) {
            console.error(`Error fetching data for level ${levelName}:`, error);
            break;
        }
    }

    if (!levelData) {
        throw new Error(`No exact match found for '${levelName}'.`);
    }

    return levelData;
}

async function getBestOption(levelName) {
    const searchResults = await searchLevels(levelName);

    return searchResults[0];
}

function generateLink(composedLevels) {
    const outputContainer = document.getElementById('result');
    const levelIds = composedLevels.map(level => level.id).join(',');
    const levelCount = composedLevels.length;

    const link = document.createElement('a');
    link.href = `https://gdbrowser.com/search/${levelIds}?list&count=${levelCount}&header=Output`;
    link.textContent = 'GDBrowser';
    link.target = '_blank';

    const outputHeading = document.querySelector('#result h2');
    outputHeading.insertAdjacentElement('afterend', link);
}
